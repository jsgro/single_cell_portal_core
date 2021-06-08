require "test_helper"

class DataRepoClientTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
    @data_repo_client = ApplicationController.data_repo_client
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

  test 'should get datasets' do
    datasets = @data_repo_client.get_datasets
    assert datasets.dig('total').present?
    skip 'got empty response for datasets' if datasets.dig('items').empty?
    dataset_id = datasets.dig('items').first.dig('id')
    dataset = @data_repo_client.get_dataset(dataset_id)
    assert dataset.present?
  end

  test 'should get snapshots' do
    snapshots = @data_repo_client.get_snapshots
    assert snapshots.dig('total').present?
    skip 'got empty response for snapshots' if snapshots.dig('items').empty?
    snapshot_id = snapshots.dig('items').first.dig('id')
    snapshot = @data_repo_client.get_snapshot(snapshot_id)
    assert snapshot.present?
  end
end
