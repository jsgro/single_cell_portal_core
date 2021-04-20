require "integration_test_helper"
require 'minitest/mock'

class BillingProjectsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @test_user = User.find_by(email: 'testing.user@gmail.com')
    sign_in @test_user
    auth_as_user @test_user
  end

  teardown do
    OmniAuth.config.mock_auth[:google] = nil
    OmniAuth.config.mock_auth[:google_billing] = nil
  end

  test 'should reauthenticate user when accessing billing projects' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    # ensure users are redirected to access request page that explains need for cloud-billing.readonly scope
    get billing_projects_path
    assert_response 302
    assert_redirected_to billing_projects_access_request_path

    # mock user authenticating with cloud-billing scope
    auth_as_user(@test_user, :google_billing)

    # double mock is required as stubbing FireCloudClient.new can occasionally cause a MockExpectationError depending on
    # the order in which test suites are executed during a full CI test run
    thurloe_mock = Minitest::Mock.new
    thurloe_mock.expect :services_available?, true, [FireCloudClient::THURLOE_SERVICE]
    thurloe_mock.expect :storage_issuer, String
    ApplicationController.stub :firecloud_client, thurloe_mock do
      # mock all service/permission checks that happen when loading billing projects page
      billing_projects_mock = Minitest::Mock.new
      billing_projects_mock.expect :get_billing_accounts, []
      billing_projects_mock.expect :get_billing_projects, []
      FireCloudClient.stub :new, billing_projects_mock do
        get billing_projects_path
        assert_response 200
        billing_projects_mock.verify
      end
      thurloe_mock.verify
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
