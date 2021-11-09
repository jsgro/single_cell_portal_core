require 'test_helper'

class HcaAzulClientTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
    @hca_azul_client = ApplicationController.hca_azul_client
    @project_shortname = 'HumanTissueTcellActivation'
    @project_id = '4a95101c-9ffc-4f30-a809-f04518a23803'
    @facets = [
      { id: 'disease', filters: [{ id: 'MONDO_0005109', name: 'HIV infectious disease' }] },
      { id: 'species', filters: [{ id: 'NCBITaxon_9606', name: 'Homo sapiens' }] }
    ]
    catalogs = @hca_azul_client.catalogs
    @default_catalog = catalogs['default_catalog']
  end

  # skip a test if Azul is not up ; prevents unnecessary build failures due to releases/maintenance
  def skip_if_api_down
    unless @hca_azul_client.api_available?
      puts '-- skipping due to Azul API being unavailable --' ; skip
    end
  end

  # retrieve nested entries from Azul response JSON
  # all responses have a constant structure of hits, pagination, and termFacets
  # under 'hits' there are protocols, entryId, sources, projects, samples, specimens, cellLines, donorOrganisms,
  # organoids, cellSuspensions, and fileTypeSummaries
  def get_entries_from_response(response, key)
    response.with_indifferent_access[:hits].map { |entry| entry[key] }.flatten
  end

  test 'should instantiate client' do
    client = HcaAzulClient.new
    assert_equal HcaAzulClient::BASE_URL, client.api_root
  end

  test 'should check if Azul is up' do
    skip_if_api_down
    assert @hca_azul_client.api_available?
  end

  test 'should get Azul service status info' do
    skip_if_api_down
    status = @hca_azul_client.service_information
    assert status['up']
    expected_keys = %w[api_endpoints elasticsearch up]
    assert_equal expected_keys, status.keys.sort
  end

  test 'should get catalogs' do
    skip_if_api_down
    catalogs = @hca_azul_client.catalogs
    default_catalog = catalogs['default_catalog']
    public_catalogs = catalogs['catalogs'].reject { |_, catalog| catalog['internal'] }.keys
    assert default_catalog.present?
    assert_not_empty public_catalogs
    assert_includes public_catalogs, default_catalog
  end

  test 'should get projects' do
    skip_if_api_down
    raw_projects = @hca_azul_client.projects(size: 10)
    projects = get_entries_from_response(raw_projects, :projects)
    assert projects.size == 10
    project = projects.first
    %w[projectId projectTitle projectDescription projectShortname].each do |key|
      assert project[key].present?
    end
  end

  test 'should query projects using facets' do
    skip_if_api_down
    query = @hca_azul_client.format_query_from_facets(@facets)
    raw_projects = @hca_azul_client.projects(query: query, size: 1)
    projects = get_entries_from_response(raw_projects, :projects)
    assert_equal 1, projects.size
  end

  test 'should get one project' do
    skip_if_api_down
    project = @hca_azul_client.project(@project_id)
    assert_equal @project_id, project['entryId']
    project_detail = project['projects'].first
    assert_equal @project_shortname, project_detail['projectShortname']
  end

  test 'should get files' do
    skip_if_api_down
    files = ApplicationController.hca_azul_client.files(size: 1)
    assert_equal 1, files.size
    file = files.first
    keys = %w[name format size url source].sort
    assert_equal keys, file.keys.sort & keys
  end

  test 'should search files using facets' do
    skip_if_api_down
    query = @hca_azul_client.format_query_from_facets(@facets)
    files = ApplicationController.hca_azul_client.files(query: query, size: 10)
    assert_equal 10, files.size
    file = files.first
    keys = %w[name format size url source].sort
    assert_equal keys, file.keys.sort & keys
  end

  test 'should get HCA metadata tsv link' do
    skip_if_api_down
    manifest_info = @hca_azul_client.project_manifest_link(@project_id)
    assert manifest_info.present?
    assert_equal 302, manifest_info['Status']
    # make GET on manifest URL and assert contents are HCA metadata
    manifest_response = RestClient.get manifest_info['Location']
    assert_equal 200, manifest_response.code
    raw_manifest = manifest_response.body.split("\r\n")
    headers = raw_manifest.first.split("\t")
    project_id_header = 'project.provenance.document_id'
    assert headers.include? project_id_header
    project_idx = headers.index(project_id_header)
    data_row = raw_manifest.sample.split("\t")
    assert_equal @project_id, data_row[project_idx]
  end

  test 'should format object for query string' do
    query_object = { 'foo' => { 'bar' => 'baz' } }
    expected_response = '%7B%22foo%22%3A%7B%22bar%22%3A%22baz%22%7D%7D'
    formatted_query = @hca_azul_client.format_hash_as_query_string(query_object)
    assert_equal expected_response, formatted_query
    # assert we can get back to original object, but as JSON
    query_as_json = CGI.unescape(formatted_query)
    assert_equal query_object.to_json, query_as_json
  end

  test 'should format query object from search facets' do
    query = @hca_azul_client.format_query_from_facets(@facets)
    expected_query = {
      sampleDisease: { is: ['HIV infectious disease'] },
      genusSpecies: { is: ['Homo sapiens'] }
    }.with_indifferent_access
    assert_equal expected_query, query
  end

  test 'should append HCA catalog name to queries' do
    path = '/index/projects'
    appended_path = @hca_azul_client.append_catalog(path, @default_catalog)
    expected_path = "#{path}?catalog=#{@default_catalog}"
    assert_equal expected_path, appended_path
    path += '?size=1'
    expected_path = "#{path}&catalog=#{@default_catalog}"
    appended_path = @hca_azul_client.append_catalog(path, @default_catalog)
    assert_equal expected_path, appended_path
    # test error handling
    bad_catalog = 'foo'
    assert_raises ArgumentError do
      @hca_azul_client.append_catalog(path, bad_catalog)
    end
  end
end
