class AddDifferentialExpressionFlagsToAnnotations < Mongoid::Migration
  def self.up
    CellMetadatum.update_all(is_differential_expression_enabled: false)
    ClusterGroup.where(:cell_annotations.nin => [[], nil]).each do |cluster|
      cluster.cell_annotations.each do |cell_annotation|
        cell_annotation[:is_differential_expression_enabled] = false
      end
      cluster.save
    end
  end

  def self.down
    CellMetadatum.all.each do |metadata|
      metadata.unset(:is_differential_expression_enabled)
    end
    ClusterGroup.where(:cell_annotations.nin => [[], nil]).each do |cluster|
      cluster.cell_annotations.each do |cell_annotation|
        cell_annotation.delete(:is_differential_expression_enabled)
      end
      cluster.save
    end
  end
end
