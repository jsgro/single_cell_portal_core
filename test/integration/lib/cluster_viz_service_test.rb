require 'test_helper'

class ClusterVizServiceTest < ActiveSupport::TestCase

  setup do
    @user = FactoryBot.create(:admin_user)
    @study = FactoryBot.create(:detached_study, name: 'Test Cluster Study')
    @study_cluster_file_1 = FactoryBot.create(:cluster_file,
                                              name: 'cluster_1.txt', study: @study,
                                              cell_input: {
                                                  x: [1, 4 ,6],
                                                  y: [7, 5, 3],
                                                  z: [2, 8, 9],
                                                  cells: ['A', 'B', 'C']
                                              },
                                              x_axis_label: 'PCA 1',
                                              y_axis_label: 'PCA 2',
                                              z_axis_label: 'PCA 3',
                                              cluster_type: '3d',
                                              annotation_input: [
                                                  {name: 'Category', type: 'group', values: ['bar', 'bar', 'baz']},
                                                  {name: 'Intensity', type: 'numeric', values: [1.1, 2.2, 3.3]}
                                              ])

    @study_cluster_file_2 = FactoryBot.create(:cluster_file,
                                              name: 'cluster_2.txt', study: @study,
                                              cell_input: {
                                                  x: [1, 2, 3],
                                                  y: [4, 5, 6],
                                                  cells: ['D', 'E', 'F']
                                              })

    @study_metadata_file = FactoryBot.create(:metadata_file,
                                             name: 'metadata.txt', study: @study,
                                             cell_input: ['A', 'B', 'C'],
                                             annotation_input: [
                                                 {name: 'species', type: 'group', values: ['dog', 'cat', 'dog']},
                                                 {name: 'disease', type: 'group', values: ['none', 'none', 'measles']}
                                             ])

    defaults = {
        cluster: 'cluster_1.txt',
        annotation: 'species--group--study'
    }
    @study.update(default_options: defaults)

  end

  teardown do
    StudyFile.where(study_id: @study.id).destroy_all
    DataArray.where(study_id: @study.id).destroy_all
    ClusterGroup.where(study_id: @study.id).destroy_all
    @study.destroy
    @user.destroy
  end

  test 'should load cluster' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    # test default cluster w/ empty params
    default_cluster = @study.default_cluster
    loaded_cluster = ClusterVizService.get_cluster_group(@study, {})
    assert_equal default_cluster, loaded_cluster,
                 "Did not correctly load default cluster; #{default_cluster.name} != #{loaded_cluster.name}"

    # test loading by params
    cluster_name = 'cluster_2.txt'
    params = {cluster: cluster_name}
    expected_cluster = @study.cluster_groups.by_name(cluster_name)
    other_cluster = ClusterVizService.get_cluster_group(@study, params)
    assert_equal expected_cluster, other_cluster,
                 "Did not correctly load expected cluster; #{expected_cluster.name} != #{other_cluster.name}"

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load all clusters' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    clusters = %w(cluster_1.txt cluster_2.txt)
    all_clusters = ClusterVizService.load_cluster_group_options(@study)
    assert_equal clusters, all_clusters, "Did not load correct clusters; #{clusters} != #{all_clusters}"

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load cluster annotation options' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    expected_options = {
        'Study Wide' => [
            %w(species species--group--study), %w(disease disease--group--study)
        ],
        'Cluster-Based' => [
            %w(Category Category--group--cluster), %w(Intensity Intensity--numeric--cluster)
        ]
    }
    annotation_opts = ClusterVizService.load_cluster_group_annotations(@study, @study.default_cluster, @user)
    assert_equal expected_options, annotation_opts

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load spatial clusters' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    spatial_name = 'spatial.txt'
    FactoryBot.create(:cluster_file,
                      name: spatial_name, study: @study,
                      is_spatial: true,
                      cell_input: {
                          x: [1, 2, 3],
                          y: [4, 5, 6],
                          cells: ['Q', 'E', 'D']
                      })
    loaded_option = ClusterVizService.load_spatial_options(@study)
    assert_equal [spatial_name], loaded_option

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load subsampling options' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    # create a cluster w/ 2K cells
    coordinates = 1.upto(2000).to_a
    cells = coordinates.map {|n| "cell_#{n}"}
    cluster_name = 'cluster_subsample.txt'
    FactoryBot.create(:cluster_file,
                      name: cluster_name, study: @study,
                      cell_input: {
                          x: coordinates,
                          y: coordinates,
                          cells: cells
                      })
    cluster = @study.cluster_groups.by_name(cluster_name)
    options = ClusterVizService.subsampling_options(cluster)
    assert_equal [1000], options

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load cluster coordinates' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluster = @study.default_cluster
    metadata = @study.cell_metadata.by_name_and_type('species', 'group')
    annotation = {name: metadata.name, type: metadata.annotation_type, scope: 'study'}
    coordinates = ClusterVizService.load_cluster_group_data_array_points(@study, cluster, annotation)
    assert_equal metadata.values.sort, coordinates.keys.sort
    trace_attributes = [:x, :y, :z, :cells, :annotations, :name]
    coordinates.each do |name, trace|
      trace_attributes.each do |attribute|
        assert trace.try(:[], attribute).present?, "Did not find any values for #{name}:#{attribute}"
      end
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should transform cluster coordinates for visualization' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluster = @study.default_cluster
    metadata = @study.cell_metadata.by_name_and_type('disease', 'group')
    annotation = {name: metadata.name, type: metadata.annotation_type, scope: 'study'}
    coordinates = ClusterVizService.load_cluster_group_data_array_points(@study, cluster, annotation)
    transformed_coords = ClusterVizService.transform_coordinates(coordinates, @study, cluster, annotation)
    assert_equal coordinates.keys.size, transformed_coords.size,
                 "Did not find correct number of traces; expected #{coordinates.keys.size} but found #{transformed_coords.size}"
    expected_keys = [:x, :y, :cells, :text, :name, :type, :mode, :marker, :opacity, :annotations, :z, :textposition].sort
    transformed_coords.each do |trace|
      keys = trace.keys.sort
      assert_equal expected_keys, keys
      assert_equal 'scatter3d', trace[:type]
      assert_equal 'markers', trace[:mode]
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load coordinate labels as annotations' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluster = @study.default_cluster
    FactoryBot.create(:coordinate_label_file,
                      cluster: cluster, name: 'coordinate_labels.txt', study: @study,
                      label_input: {
                          x: [1, 2, 3],
                          y: [4, 5, 6],
                          z: [7, 8, 9],
                          text: ['Group 1', 'Group 2', 'Group 3']
                      })
    labels = ClusterVizService.load_cluster_group_coordinate_labels(cluster)
    assert_equal 3, labels.size, "Did not find correct number of labels; expected 3 but found #{labels.size}"
    selected_label = labels.first
    assert_equal 1, selected_label[:x]
    assert_equal 4, selected_label[:y]
    assert_equal 7, selected_label[:z]
    assert_equal 'Group 1', selected_label[:text]
    assert selected_label[:font].present?
    font_keys = [:family, :size, :color]
    assert_equal font_keys, selected_label[:font].keys

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should load axis labels' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluster = @study.default_cluster
    axis_labels = ClusterVizService.load_axis_labels(cluster)
    axis_labels.values.each_with_index do |label, index|
      expected_label = "PCA #{index + 1}"
      assert_equal expected_label, label
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should compute range for coordinates' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluster = @study.default_cluster
    metadata = @study.cell_metadata.by_name_and_type('species', 'group')
    annotation = {name: metadata.name, type: metadata.annotation_type, scope: 'study'}
    coordinates = ClusterVizService.load_cluster_group_data_array_points(@study, cluster, annotation)

    # range of 1 to 9, plus 2% padding of total extent of range. i.e padding =  8 * .02, or .16
    # therefore domain_range = [1 - padding, 9 + padding]
    domain_range = [0.84, 9.16]
    expected_range = {
        x: domain_range,
        y: domain_range,
        z: domain_range
    }
    calculated_range = ClusterVizService.set_range(cluster, coordinates.values)
    assert_equal expected_range, calculated_range

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should compute aspect ratio for predefined range' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cluser_file_with_range = 'cluster_ranged.txt'
    FactoryBot.create(:cluster_file,
                      name: cluser_file_with_range, study: @study,
                      cluster_type: '3d',
                      x_axis_min: 0,
                      x_axis_max: 4,
                      y_axis_min: 3,
                      y_axis_max: 7,
                      z_axis_min: 6,
                      z_axis_max: 10,
                      cell_input: {
                          x: [1, 2, 3],
                          y: [4, 5, 6],
                          z: [7, 8, 9],
                          cells: ['G', 'H', 'I']
                      })
    cluster = @study.cluster_groups.by_name(cluser_file_with_range)

    # as absolute extent for each axis is the same (4), this should enforce a cube aspect
    expected_aspect = {mode: 'cube', x: 1.0, y: 1.0, z: 1.0}
    computed_aspect = ClusterVizService.compute_aspect_ratios(cluster.domain_ranges)
    assert_equal expected_aspect, computed_aspect

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
