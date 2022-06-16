class SetDeComputationalMethod < Mongoid::Migration
  def self.up
    DifferentialExpressionResult.update_all(computational_method: 'wilcoxon')
  end

  def self.down
  end
end
