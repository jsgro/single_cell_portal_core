require 'api_test_helper'
require 'test_helper'
require 'includes_helper'

class ExceptionsControllerTest < ActionDispatch::IntegrationTest
  # overwrite configurations in test environment to allow exceptions_app to handle errors
  # these need to be overwritten only for this test as changing values globally can have unexpected results for
  # other tests
  before(:all) do
    Rails.application.config.consider_all_requests_local = false
    Rails.application.config.action_dispatch.show_exceptions = true
  end

  after(:all) do
    Rails.application.config.consider_all_requests_local = true
    Rails.application.config.action_dispatch.show_exceptions = false
  end

  test 'should render json errors in responses' do
    execute_http_request(:get, api_v1_site_get_analysis_path(namespace: 'foo', name: 'bar', snapshot: 1))
    assert_response :internal_server_error
  end
end
