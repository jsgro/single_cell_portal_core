class SetMatrixFileIdOnDifferentialExpressionResults < Mongoid::Migration
  def self.up
    DifferentialExpressionResult.all.each do |result|
      matrix = ClusterVizService.raw_matrix_for_cluster_cells(result.study, result.cluster_group)
      result.update(matrix_file_id: matrix.id)
    end
  end

  def self.down
  end
end
