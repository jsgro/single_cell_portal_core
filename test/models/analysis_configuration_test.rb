require "test_helper"

class AnalysisConfigurationTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    @analysis_configuration = AnalysisConfiguration.create(
      namespace: 'single-cell-portal', name: 'split-cluster', snapshot: 1, user: @user,
      configuration_namespace: 'single-cell-portal', configuration_name: 'split-cluster', configuration_snapshot: 2,
      description: 'This is a test description.'
    )
  end

  after(:all) do
    AnalysisConfiguration.destroy_all
  end

  test 'load required parameters from methods repo' do
    remote_config = @analysis_configuration.methods_repo_settings
    local_config = @analysis_configuration.configuration_settings
    assert local_config === remote_config, "local configs does not match remote configs; diff: #{compare_hashes(remote_config, local_config)}"
  end

  test 'can extract required inputs from configuration' do
    remote_config = @analysis_configuration.methods_repo_settings
    inputs = @analysis_configuration.required_inputs
    assert remote_config['inputs'] == inputs, "required inputs do not match; diff: #{compare_hashes(remote_config['inputs'], inputs)}"
  end

  test 'can extract required outputs from configuration' do
    remote_config = @analysis_configuration.methods_repo_settings
    outputs = @analysis_configuration.required_outputs
    assert remote_config['outputs'] == outputs, "required inputs do not match; diff: #{compare_hashes(remote_config['outputs'], outputs)}"
  end
end
