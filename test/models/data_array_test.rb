require 'test_helper'

class DataArrayTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study, name_prefix: 'Concatenation Test', test_array: @@studies_to_clean)
    @cluster_file = FactoryBot.create(:cluster_file,
                                      name: 'cluster_1.txt', study: @study,
                                      annotation_input: [])
    @cluster = ClusterGroup.find_by(study_id: @study.id, study_file_id: @cluster_file.id)
    @values = Array.new(500_000) { rand.floor(3) }
    @array_attributes = {
      name: 'x', array_type: 'coordinates', study_id: @study.id, study_file_id: @cluster_file.id,
      cluster_name: @cluster_file.name, linear_data_type: 'ClusterGroup', linear_data_id: @cluster.id,
      subsample_annotation: nil, subsample_threshold: nil
    }
    @values.each_slice(DataArray::MAX_ENTRIES).with_index do |slice, index|
      DataArray.create!(@array_attributes.merge({ values: slice, array_index: index }))
    end
  end

  after(:all) do
    DataArray.where(@array_attributes).delete_all
  end

  test 'should concatenate values in correct order' do
    concatenated_values = DataArray.concatenate_arrays(@array_attributes)
    assert_equal @values, concatenated_values
    # spot check random array
    rand_array_idx = rand(0..4)
    expected_array = @values.each_slice(DataArray::MAX_ENTRIES).to_a[rand_array_idx]
    array = DataArray.find_by(@array_attributes.merge({ array_index: rand_array_idx }))
    assert_equal expected_array, array.values
  end
end
