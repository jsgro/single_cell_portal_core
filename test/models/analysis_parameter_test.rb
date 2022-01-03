require "test_helper"

class AnalysisParameterTest < ActiveSupport::TestCase
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

  test 'should validate output file types' do
    output_param = @analysis_configuration.analysis_parameters.outputs.first
    assert output_param.is_output_file?, "Should have returned true for is_output_file?: #{output_param.is_output_file?}"
    output_param.output_file_type = "Not a file"
    assert !output_param.valid?, "Should not have validated with an invalid file type"
  end
end
