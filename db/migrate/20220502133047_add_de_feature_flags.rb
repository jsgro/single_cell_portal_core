class AddDeFeatureFlags < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end
  def self.up
    FeatureFlagMigrator.create!(name: 'differential_expression_frontend',
                                default_value: false,
                                description: 'Whether DE UX is enabled')
    FeatureFlagMigrator.create!(name: 'differential_expression_backend',
                                default_value: false,
                                description: 'Whether ingest via DE pipeline is enabled')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'differential_expression_frontend').destroy
    FeatureFlagMigrator.find_by(name: 'differential_expression_backend').destroy
  end
end
