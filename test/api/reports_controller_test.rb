require 'api_test_helper'
require 'test_helper'

class ReportsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @admin_user =  FactoryBot.create(:api_user, admin: true, test_array: @@users_to_clean)
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
  end

  test 'access control enforced' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_report_path('studies'), user: @user)
    assert_equal 403, response.status

    sign_in_and_update @admin_user
    execute_http_request(:get, api_v1_report_path('studies'), user: @admin_user)
    assert_equal 200, response.status
  end

  test 'invalid report name rejected' do
    sign_in_and_update @admin_user
    execute_http_request(:get, api_v1_report_path('blahblah'), user: @admin_user)
    assert_equal 400, response.status
  end

  test 'can fetch study report' do
    sign_in_and_update @admin_user
    execute_http_request(:get, api_v1_report_path('studies'), user: @admin_user)
    assert_equal 200, response.status
    assert response.body.starts_with?("accession\tcreated_at\tcell_count")
  end
end
