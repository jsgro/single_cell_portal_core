require 'test_helper'

class AnalysisParameterFilterTest < ActiveSupport::TestCase

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

  test 'should validate filter values' do
    input_parameter = @analysis_configuration.analysis_parameters.inputs.first
    param_filter = input_parameter.analysis_parameter_filters.build

    # validate single filter value
    param_filter.attribute_name = 'file_type'
    refute param_filter.valid?, 'Should not validate filter if value is not set with attribute_name'
    param_filter.value = 'Cluster'
    assert param_filter.valid?, 'Should validate filter with value & attribute_name both present'

    # validate multiple filter values
    param_filter.multiple = true
    refute param_filter.valid?, 'Should not validate filter if multiple_values is blank with multiple = true'
    param_filter.multiple_values = %w(Cluster Metadata)
    assert param_filter.valid?, 'Should validate filter with multiple = true & multiple_values present'
  end
end
