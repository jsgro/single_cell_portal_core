require "test_helper"

class ClusterGroupTest < ActiveSupport::TestCase
  def setup
    @cluster_group = ClusterGroup.first
  end

  test 'should not visualize unique group annotations over 100' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

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

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end

