require 'test_helper'

# test all validations to ensure security is being enforced that will block accidental deletes of user studies/workspaces
# does not directly test cleanup methods as these would destroy seed data needed for other tests
class StudyCleanupToolsTest < ActiveSupport::TestCase

  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:study, name_prefix: 'Cleanup Security Checks', test_array: @@studies_to_clean)
  end

  teardown do
    Rails.env = "test" # reset this value to prevent other env checks failing later as this will persist across all runs
  end

  test 'should validate hostname' do
    assert StudyCleanupTools.permit_hostname?
  end

  test 'should validate billing project' do
    billing_project = FireCloudClient::PORTAL_NAMESPACE
    assert StudyCleanupTools.permit_billing_project?(billing_project)

    bad_project = "this-is-not-valid"
    refute StudyCleanupTools.permit_billing_project?(bad_project)
  end

  test 'should validate environment' do
    assert StudyCleanupTools.permit_environment?

    # test allowing development environment
    Rails.env = 'development'
    assert StudyCleanupTools.permit_environment?(allow_dev_env: true)

    # ensure production-like environments are disallowed
    Rails.env = 'staging'
    refute StudyCleanupTools.permit_environment?
  end

  test 'should validate continuous integration' do
    assert StudyCleanupTools.is_continuous_integration?
  end

  test 'should match workspace creator for service account' do
    study = Study.first
    workspace = ApplicationController.firecloud_client.get_workspace(study.firecloud_project, study.firecloud_workspace)
    assert StudyCleanupTools.service_account_created_workspace?(workspace)

    # negative test with mock workspace JSON
    not_owned_by_portal = {workspace: {createdBy: @user.email}}
    refute StudyCleanupTools.service_account_created_workspace?(not_owned_by_portal)
  end

  test 'should raise error on validation failure' do

    # positive tests - known goods should return nil as there is no declared return value
    # no arguments
    assert_nil StudyCleanupTools.halt_on_validation_fail(:permit_environment?)

    # with arguments
    assert_nil StudyCleanupTools.halt_on_validation_fail(:permit_billing_project?, FireCloudClient::PORTAL_NAMESPACE)

    # negative test with no arguments - should throw RuntimeError
    begin
      Rails.env = 'staging'
      StudyCleanupTools.halt_on_validation_fail(:permit_environment?)
    rescue RuntimeError => error
      assert error.is_a?(RuntimeError)
      assert error.message.include?('permit_environment?'),
             "Did not find validation method signature for :permit_environment? in message: #{error.message}"
    end

    # negative test with arguments
    begin
      StudyCleanupTools.halt_on_validation_fail(:permit_billing_project?, 'invalid-project')
    rescue RuntimeError => error
      assert error.is_a?(RuntimeError)
      assert error.message.include?('permit_billing_project?'),
             "Did not find method signature for :permit_billing_project? in message: #{error.message}"
    end
  end

  test 'should validate confirmation prompt before deleting' do
    # simulate user prompt by mocking $stdin.gets
    # positive test
    mock = Minitest::Mock.new
    mock.expect :gets, 'Delete All'
    StringIO.stub :new, mock do
      assert StudyCleanupTools.confirm_delete_request?(StringIO.new)
      mock.verify
    end

    # negative test
    mock = Minitest::Mock.new
    mock.expect :gets, 'this should fail'
    StringIO.stub :new, mock do
      refute StudyCleanupTools.confirm_delete_request?(StringIO.new)
      mock.verify
    end
  end
end
