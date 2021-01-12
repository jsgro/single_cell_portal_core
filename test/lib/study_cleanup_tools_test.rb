require 'test_helper'

# test all validations to ensure security is being enforced that will block accidental deletes of user studies/workspaces
class StudyCleanupToolsTest < ActiveSupport::TestCase

  include TestInstrumentor

  teardown do
    Rails.env = "test" # reset this value to prevent other env checks failing later as this will persist across all runs
  end

  test 'should validate hostname' do
    assert StudyCleanupTools.validate_hostname!
  end

  test 'should validate billing project' do
    billing_project = FireCloudClient::PORTAL_NAMESPACE
    assert StudyCleanupTools.validate_billing_project!(billing_project)

    # ensure error is raised on validation fail
    begin
      bad_project = "this-is-not-valid"
      refute StudyCleanupTools.validate_billing_project!(bad_project)
    rescue ArgumentError => error
      assert error.is_a?(ArgumentError)
    end
  end

  test 'should validate environment' do
    assert StudyCleanupTools.validate_environment!

    # test allowing development environment
    Rails.env = 'development'
    assert StudyCleanupTools.validate_environment!(allow_dev_env: true)

    # ensure error is raised on validation fail
    begin
      Rails.env = 'staging'
      refute StudyCleanupTools.validate_environment!
    rescue ArgumentError => error
      assert error.is_a?(ArgumentError)
    end
  end

  test 'should validate continuous integration' do
    assert StudyCleanupTools.validate_continuous_integration!
  end
end
