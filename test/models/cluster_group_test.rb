require 'test_helper'

class ClusterGroupTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study, name_prefix: 'Basic Viz', test_array: @@studies_to_clean)
    @cluster_file = FactoryBot.create(:cluster_file,
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

    @cluster = @study.cluster_groups.first
  end

  test 'should not visualize unique group annotations over 100' do
    annotation_values = []
    300.times { annotation_values << SecureRandom.uuid }
    cell_annotation = {name: 'Group Annotation', type: 'group', values: annotation_values}
    cluster = ClusterGroup.new(name: 'Group Count Test', cluster_type: '2d', cell_annotations: [cell_annotation])
    can_visualize = cluster.can_visualize_cell_annotation?(cell_annotation)
    assert !can_visualize, "Should not be able to visualize group cell annotation with more that 100 unique values: #{can_visualize}"

    # check numeric annotations are still fine
    new_cell_annotation = {name: 'Numeric Annotation', type: 'numeric', values: []}
    cluster.cell_annotations << new_cell_annotation
    can_visualize_numeric  = cluster.can_visualize_cell_annotation?(new_cell_annotation)
    assert can_visualize_numeric, "Should be able to visualize numeric cell annotation at any level: #{can_visualize_numeric}"
  end

  test 'should set point count on cluster group' do
    # ensure cluster point count was set by FactoryBot
    assert_equal 3, @cluster.points

    @cluster.update!(points: nil)
    assert_nil @cluster.points

    # test both return value and assignment for set_point_count!
    points = @cluster.set_point_count!
    assert_equal 3, points
    assert_equal 3, @cluster.points
  end
end

