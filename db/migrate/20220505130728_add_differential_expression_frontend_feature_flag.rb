class AddDifferentialExpressionFrontendFeatureFlag < Mongoid::Migration
  def self.up
    FeatureFlag.create!(name: 'differential_expression_frontend',
                                default_value: false,
                                description: 'Whether DE UX is enabled')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'differential_expression_frontend').destroy
  end
end
