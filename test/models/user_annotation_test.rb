require 'test_helper'

class UserAnnotationTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'UserAnnotation Test',
                               public: false,
                               user: @user,
                               test_array: @@studies_to_clean)
    cluster_file = FactoryBot.create(:cluster_file, name: 'cluster_example.txt', study: @study)
    metadata_file = FactoryBot.create(:metadata_file, name: 'metadata.txt', study: @study)
    expression_file = FactoryBot.create(:study_file, name: 'dense.txt', file_type: 'Expression Matrix', study: @study)
    # manually populate clustering/metadata information since this requires large arrays
    @cluster = ClusterGroup.create!(name: 'Test Cluster', study: @study, study_file_id: cluster_file.id,
                                    cluster_type: '3d',
                                    cell_annotations: [
                                      {
                                        name: 'Category',
                                        type: 'group',
                                        values: %w(a b c d)
                                      },
                                      {
                                        name: 'Intensity',
                                        type: 'numeric',
                                        values: []
                                      }])
    # create raw arrays of values to use in DataArrays and StudyMetadatum
    category_array = %w[a b c d].repeated_combination(18).to_a.flatten
    metadata_label_array = %w[E F G H].repeated_combination(18).to_a.flatten
    point_array = 0.upto(category_array.size - 1).to_a
    cluster_cell_array = point_array.map { |p| "cell_#{p}" }
    all_cell_array = 0.upto(metadata_label_array.size - 1).map { |c| "cell_#{c}" }
    intensity_array = point_array.map { |p| rand }
    metadata_score_array = all_cell_array.map { |p| rand }
    study_cells = @study.data_arrays.build(name: 'All Cells', array_type: 'cells', cluster_name: 'UserAnnotation Test',
                                           array_index: 1, values: all_cell_array, study: @study,
                                           study_file: expression_file)
    study_cells.save!
    x_array = @cluster.data_arrays.build(name: 'x', cluster_name: @cluster.name, array_type: 'coordinates',
                                         array_index: 1, study: @study, values: point_array, study_file: cluster_file)
    x_array.save!
    y_array = @cluster.data_arrays.build(name: 'y', cluster_name: @cluster.name, array_type: 'coordinates',
                                         array_index: 1, study: @study, values: point_array, study_file: cluster_file)
    y_array.save!
    z_array = @cluster.data_arrays.build(name: 'z', cluster_name: @cluster.name, array_type: 'coordinates',
                                         array_index: 1, study: @study, values: point_array, study_file: cluster_file)
    z_array.save!
    cluster_txt = @cluster.data_arrays.build(name: 'text', cluster_name: @cluster.name, array_type: 'cells',
                                             array_index: 1, study: @study, values: cluster_cell_array,
                                             study_file: cluster_file)
    cluster_txt.save!
    cluster_cat_array = @cluster.data_arrays.build(name: 'Category', cluster_name: @cluster.name,
                                                   array_type: 'annotations', array_index: 1, study: @study,
                                                   values: category_array, study_file: cluster_file)
    cluster_cat_array.save!
    cluster_int_array = @cluster.data_arrays.build(name: 'Intensity', cluster_name: @cluster.name,
                                                   array_type: 'annotations', array_index: 1, study: @study,
                                                   values: intensity_array, study_file: cluster_file)
    cluster_int_array.save!
    # set point count on cluster after arrays are saved
    @cluster.set_point_count!

    cell_metadata_1 = CellMetadatum.create!(name: 'Label', annotation_type: 'group', study: @study,
                                            values: metadata_label_array.uniq, study_file: metadata_file)
    cell_metadata_2 = CellMetadatum.create!(name: 'Score', annotation_type: 'numeric', study: @study,
                                            values: metadata_score_array.uniq, study_file: metadata_file)
    meta1_vals = cell_metadata_1.data_arrays.build(name: 'Label', cluster_name: 'Label', array_type: 'annotations',
                                                   array_index: 1, values: metadata_label_array, study: @study,
                                                   study_file: metadata_file)
    meta1_vals.save!
    meta2_vals = cell_metadata_2.data_arrays.build(name: 'Score', cluster_name: 'Score', array_type: 'annotations',
                                                   array_index: 1, values: metadata_score_array, study: @study,
                                                   study_file: metadata_file)
    meta2_vals.save!
  end

  def test_generate_user_annotation_full_data
    # Generate keys
    num_keys = rand(8) + 2
    keys = []
    i = 0
    while i < num_keys
      keys.push(i.to_s)
      i += 1
    end
    # test at full data first
    potential_labels = %w[Label--group--study Category--group--cluster]
    loaded_annotation = potential_labels.sample
    puts "loaded_annotation: #{loaded_annotation}"
    @user_annotation = UserAnnotation.create(user_id: @user.id, study_id: @study.id, cluster_group_id: @cluster.id,
                                             values: keys, name: 'fulldata', source_resolution: nil)

    # build user_data_array_attributes
    user_data_arrays_attributes = {}

    # Get all the cell names and shuffle to randomize their order
    cell_array = @cluster.concatenate_data_arrays('text', 'cells').shuffle
    len_segment = (cell_array.length / num_keys).floor

    # Spoof the parameter hash passed in the site controller
    keys.each_with_index do |key, i|
      cell_names = []
      add = cell_array.slice!(0, len_segment)
      if i+1  == keys.length
        cell_names.concat(cell_array)
      end
      cell_names.concat(add)

      user_data_arrays_attributes["#{key}"] = {:values => cell_names.join(','),  :name => key}
    end

    # Create the data arrays
    @user_annotation.initialize_user_data_arrays(user_data_arrays_attributes, nil, nil, loaded_annotation)

    # Check some random points and see if they were created correctly
    data_arrays_cells = @user_annotation.user_data_arrays.where(array_type: 'cells').first.values
    data_arrays_annotations = @user_annotation.user_data_arrays.where(array_type: 'annotations').first.values
    keys.each do
      random_cell_num = rand(data_arrays_cells.length).floor

      value_in_array = data_arrays_annotations[random_cell_num]
      original_hash = user_data_arrays_attributes["#{value_in_array}"][:values].split(',')

      puts "original hash should include #{data_arrays_cells[random_cell_num]}"

      assert (original_hash.include? data_arrays_cells[random_cell_num]),
             "#{original_hash} should include #{data_arrays_cells[random_cell_num]}"
    end

    # Check that created at method works correctly
    created_at = @user_annotation.source_resolution_label
    assert created_at == 'All Cells', "Incorrect created at, '#{created_at} should be 'Created at Full Data"

    # Check that 16 data arrays were created
    num_data_arrays = @user_annotation.user_data_arrays.all.to_a.count
    assert num_data_arrays == 16, "Incorrect number of user data arrays, #{num_data_arrays} instead of 16"
  end
end
