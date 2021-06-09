require "test_helper"

class DataRepoClientTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
    @data_repo_client = ApplicationController.data_repo_client
    @dataset_id = 'd918e6f2-e63b-4d9c-82a6-f0d44c6bcc0d' # dataset for snapshot, we don't actually have access to this
    @snapshot_id = 'fcaee9e0-4745-4006-9718-7d048a846d96' # dev PulmonaryFibrosisGSE135893 snapshot
    @file_id = '5009a1f8-c2ee-4ceb-8ddb-40c3ddee5472' # ID of sequence file in PulmonaryFibrosisGSE135893 snapshot
    @filename = 'IPF_VUILD54_1_LU_Whole_C1_X5SCR_F00207_HMWLCBGX7_ATTTGCTA_L001_R1_001.fastq.gz' # name of above file
    @drs_file_id = "drs://#{DataRepoClient::REPOSITORY_HOSTNAME}/v1_#{@snapshot_id}_#{@file_id}" # computed DRS id
    bucket_id = 'broad-jade-dev-data-bucket'
    @gs_url = "gs://#{bucket_id}/#{@dataset_id}/#{@file_id}/#{@filename}" # computed GS url
    @https_url = "https://www.googleapis.com/storage/v1/b/#{bucket_id}/o/#{@dataset_id}%2F#{@file_id}%2F#{@filename}?alt=media"
  end

  # skip a test if the TDR API is not up (since it is their dev instance there is no uptime guarantee)
  def skip_if_api_down
    if !@data_repo_client.api_available?
      puts "-- skipping due to TDR API being unavailable --" ; skip
    end
  end

  test 'should instantiate client' do
    client = DataRepoClient.new
    assert client.present?
    assert_equal Rails.application.config.tdr_api_base_url, client.api_root
  end

  test 'should refresh access token' do
    token = @data_repo_client.access_token
    current_expiry = @data_repo_client.expires_at
    sleep 1
    new_token = @data_repo_client.refresh_access_token!
    assert_not_equal token, new_token
    assert current_expiry < @data_repo_client.expires_at
  end

  test 'should get token expiration' do
    refute @data_repo_client.access_token_expired?
    @data_repo_client.expires_at = 1.day.ago
    assert @data_repo_client.access_token_expired?
  end

  test 'should get valid access token' do
    @data_repo_client.refresh_access_token!
    access_token = @data_repo_client.access_token
    current_expiry = @data_repo_client.expires_at
    valid_token = @data_repo_client.valid_access_token
    assert_equal access_token, valid_token
    @data_repo_client.expires_at = 1.day.ago
    sleep 1
    new_token = @data_repo_client.valid_access_token
    assert_not_equal access_token, new_token
    assert current_expiry < @data_repo_client.expires_at
  end

  test 'should get issuer email' do
    service_account_email = JSON.parse(File.open(@data_repo_client.service_account_credentials).read).dig('client_email')
    assert_equal service_account_email, @data_repo_client.issuer
  end

  test 'should determine ok response code' do
    200.upto(206) do |code|
      # only 203 & 205 should not return OK
      if code.even? || code == 201
        assert @data_repo_client.ok?(code)
      else
        refute @data_repo_client.ok?(code)
      end
    end
    refute @data_repo_client.ok?(404)
  end

  test 'should determine retry from response code' do
    [nil, 502, 503, 504].each do |code|
      assert @data_repo_client.should_retry?(code)
    end
    refute @data_repo_client.should_retry?(404)
  end

  test 'should merge query string params from hash' do
    opts = {foo: 'bar', bing: 'baz'}
    expected_query = "?foo=bar&bing=baz"
    assert_equal expected_query, @data_repo_client.merge_query_options(opts)
    # ensure params are uri-encoded
    new_opts = {one: 'foo', two: 'bar bing'}
    expected_encoded_query = "?one=foo&two=bar%20bing"
    assert_equal expected_encoded_query, @data_repo_client.merge_query_options(new_opts)
  end

  test 'should parse response body' do
    response = {
      total: 1,
      items: [
        {
          id: SecureRandom.uuid, name: 'My Dataset', description: 'This is the description',
          createdDate: Time.now.to_s(:db), profileId: SecureRandom.uuid
        }
      ]
    }.with_indifferent_access
    parsed_response = @data_repo_client.parse_response_body(response.to_json)
    assert_equal response, parsed_response.with_indifferent_access

    string_response = "This is the response"
    parsed_string = @data_repo_client.parse_response_body(string_response)
    assert_equal string_response, parsed_string
  end

  test 'should get api status' do
    skip_if_api_down
    status = @data_repo_client.api_status
    assert status['ok']
  end

  test 'should check if api is available' do
    skip_if_api_down
    assert @data_repo_client.api_available?
  end

  test 'should get datasets' do
    skip_if_api_down
    datasets = @data_repo_client.get_datasets
    assert datasets.dig('total').present?
    skip 'got empty response for datasets' if datasets.dig('items').empty?
    dataset_id = datasets.dig('items').first.dig('id')
    dataset = @data_repo_client.get_dataset(dataset_id)
    assert dataset.present?
  end

  test 'should get snapshots' do
    skip_if_api_down
    snapshots = @data_repo_client.get_snapshots
    assert snapshots.dig('total').present?
    skip 'got empty response for snapshots' if snapshots.dig('items').empty?
    snapshot_id = snapshots.dig('items').first.dig('id')
    snapshot = @data_repo_client.get_snapshot(snapshot_id)
    assert snapshot.present?
  end

  test 'should get snapshot' do
    skip_if_api_down
    snapshot = @data_repo_client.get_snapshot(@snapshot_id)
    assert snapshot.present?
    expected_keys = %w(id name description createdDate source tables
                       relationships profileId dataProject accessInformation).sort
    assert_equal expected_keys, snapshot.keys.sort
  end

  test 'should get file in snapshot' do
    skip_if_api_down
    file_info = @data_repo_client.get_snapshot_file_info(@snapshot_id, @file_id)
    assert file_info.present?
    assert_equal @file_id, file_info.dig('fileId')
    assert file_info.dig('size') > 0, 'did not get a valid file size'
    found_gs_url = file_info.dig('fileDetail', 'accessUrl')
    assert_equal @gs_url, found_gs_url
  end

  test 'should generate query json from facets' do
    selected_facets = [
      {id: :species, filters: [{id: 'NCBITaxon9609', name: 'Homo sapiens'}]},
      {id: :disease, filters: [{id: 'MONDO_0018076', name: 'tuberculosis'},{id: 'MONDO_0005109', name: 'HIV infectious disease'}]}
    ]
    expected_query = "(species:NCBITaxon9609 OR species:Homo sapiens) AND (disease:MONDO_0018076 OR disease:tuberculosis " \
                     "OR disease:MONDO_0005109 OR disease:HIV infectious disease)"

    query_json = @data_repo_client.generate_query_from_facets(selected_facets)
    assert_equal expected_query, query_json.dig(:query_string, :query)
  end

  test 'should query snapshot index' do
    skip_if_api_down
    selected_facets = [
      {id: :species, filters: [{id: 'NCBITaxon9609', name: 'Homo sapiens'}]}
    ]
    query_json = @data_repo_client.generate_query_from_facets(selected_facets)
    results = @data_repo_client.query_snapshot_indexes(query_json, snapshot_ids: [@snapshot_id])
    original_count = results.dig('result').count
    assert original_count > 0
    sample_row = results.dig('result').sample
    assert_equal 'Homo sapiens', sample_row.dig('genus_species')
    expected_project = 'Single-cell RNA-sequencing reveals profibrotic roles of distinct epithelial and mesenchymal lineages in pulmonary fibrosis'
    assert_equal expected_project, sample_row.dig('project_title')

    # refine query and re-run
    selected_facets = [
      {id: :species, filters: [{id: 'NCBITaxon9609', name: 'Homo sapiens'}]},
      {id: :organism_age, filters: {min: 46, max: 72, unit: 'years'}}
    ]
    query_json = @data_repo_client.generate_query_from_facets(selected_facets)
    results = @data_repo_client.query_snapshot_indexes(query_json, snapshot_ids: [@snapshot_id])
    new_count = results.dig('result').count
    assert new_count < original_count
    sample_row = results.dig('result').sample
    assert_equal '46-72', sample_row.dig('organism_age')
  end

  test 'should get file info from drs id' do
    skip_if_api_down
    file_info = @data_repo_client.get_drs_file_info(@drs_file_id)
    assert file_info.present?
    expected_id = @drs_file_id.split('/').last
    assert_equal expected_id, file_info.dig('id')
    assert file_info.dig('size') > 0, 'did not get a valid file size'
    found_filename = file_info.dig('name')
    assert_equal @filename, found_filename

    # ensure error handling
    assert_raise ArgumentError do
      @data_repo_client.get_drs_file_info('foo')
    end
  end

  test 'should get access url from drs id' do
    skip_if_api_down
    found_gs_url = @data_repo_client.get_access_url_from_drs_id(@drs_file_id, :gs)
    assert_equal @gs_url, found_gs_url

    found_https_url = @data_repo_client.get_access_url_from_drs_id(@drs_file_id, :https)
    assert_equal @https_url, found_https_url

    # ensure error handling
    assert_raise ArgumentError do
      @data_repo_client.get_access_url_from_drs_id('foo', :gs)
    end
  end
end
