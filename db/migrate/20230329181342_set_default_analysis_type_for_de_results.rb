class SetDefaultAnalysisTypeForDeResults < Mongoid::Migration
  def self.up
    DifferentialExpressionResult.update_all(analysis_type: DifferentialExpressionResult::DEFAULT_ANALYSIS)
  end

  def self.down
    DifferentialExpressionResult.all.each { |result| result.unset(:analysis_type) }
  end
end
