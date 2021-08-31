require 'test_helper'

class HcaAzulClientTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
    @hca_azul_client = ApplicationController.hca_azul_client
    @project_id = 'c1a9a93d-d9de-4e65-9619-a9cec1052eaa'
    @project_short_name = 'PulmonaryFibrosisGSE135893'
    @default_catalog = @hca_azul_client.default_catalog || 'dcp7'
    @facets = [
      { id: 'disease', filters: [{ id: 'MONDO_0005109', name: 'HIV infectious disease' }] },
      { id: 'species', filters: [{ id: 'NCBITaxon_9606', name: 'Homo sapiens' }] }
    ]
  end

  test 'should instantiate client' do
    client = HcaAzulClient.new
    assert_equal HcaAzulClient::BASE_URL, client.api_root
    assert_equal @default_catalog, client.default_catalog
    assert client.all_catalogs.any?
  end

  test 'should get catalogs' do
    catalogs = @hca_azul_client.catalogs
    default_catalog = catalogs['default_catalog']
    public_catalogs = catalogs['catalogs'].reject { |_, catalog| catalog['internal'] }.keys
    assert_equal @hca_azul_client.all_catalogs.sort, public_catalogs.sort
    assert_equal @hca_azul_client.default_catalog, default_catalog
  end

  test 'should get projects' do
    projects = @hca_azul_client.projects(size: 10)
    assert projects.size == 10
    project = projects.first
    %w[projectId projectTitle projectDescription projectShortname].each do |key|
      assert project[key].present?
    end
  end

  test 'should query projects using facets' do
    query = @hca_azul_client.format_query_from_facets(@facets)
    projects = @hca_azul_client.projects(query: query, size: 1)
    assert_equal 1, projects.size
  end

  test 'should query projects using terms' do
    terms = %w[cell human]
    projects = @hca_azul_client.projects(size: 10, terms: terms)
    assert projects.any?
    # since we filter after getting results, we may not get all 10
    assert projects.count <= 10
    projects.each do |project|
      matcher = /#{terms.join('|')}/i
      assert project['projectTitle'] =~ matcher || project['projectDescription'] =~ matcher
    end
  end

  test 'should get one project' do
    project = @hca_azul_client.project(@project_id)
    assert_equal @project_id, project['entryId']
    project_detail = project['projects'].first
    assert_equal @project_short_name, project_detail['projectShortname']
  end

  test 'should get files' do
    files = ApplicationController.hca_azul_client.files(size: 1)
    assert_equal 1, files.size
    file = files.first
    keys = %w[name format size url source].sort
    assert_equal keys, file.keys.sort & keys
  end

  test 'should search files using facets' do
    query = @hca_azul_client.format_query_from_facets(@facets)
    files = ApplicationController.hca_azul_client.files(query: query, size: 10)
    assert_equal 10, files.size
    file = files.first
    keys = %w[name format size url source].sort
    assert_equal keys, file.keys.sort & keys
  end

  test 'should get HCA metadata tsv link' do
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

  test 'should format regular expression for term matching' do
    terms = ['foo', 'bar', 'bing baz boo']
    regex = @hca_azul_client.format_term_regex(terms)
    expected_regex = /foo|bar|bing\ baz\ boo/i
    assert_equal expected_regex, regex
  end
end
