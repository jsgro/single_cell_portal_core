require 'test_helper'

# test all validations to ensure security is being enforced that will block accidental deletes of user studies/workspaces
class StudyCleanupToolsTest < ActiveSupport::TestCase

  include TestInstrumentor

  test 'should validate hostname' do
    assert StudyCleanupTools.validate_hostname!, "#{Socket.gethostname} hostname should have validated but did not"
  end

  test 'should validate billing project' do
    billing_project = FireCloudClient::PORTAL_NAMESPACE
    assert StudyCleanupTools.validate_billing_project!(billing_project),
           "#{billing_project} project should have validated but did not"

    # ensure error is raised on validation fail
    begin
      bad_project = "this-is-not-valid"
      refute StudyCleanupTools.validate_billing_project!(bad_project), "#{bad_project} should not have validated but did"
    rescue ArgumentError => error
      assert error.is_a?(ArgumentError)
    end
  end

  test 'should validate environment' do
    assert StudyCleanupTools.validate_environment!, "#{Rails.env} environment should have validated but did not"

    # test allowing development environment
    Rails.env = 'development'
    assert StudyCleanupTools.validate_environment!(allow_dev_env: true),
           "#{Rails.env} environment should have validated but did not"
    # ensure error is raised on validation fail
    begin
      Rails.env = 'staging'
      refute StudyCleanupTools.validate_environment!, "#{Rails.env} environment should not have validated but did"
    rescue ArgumentError => error
      assert error.is_a?(ArgumentError)
    end
  end
end
