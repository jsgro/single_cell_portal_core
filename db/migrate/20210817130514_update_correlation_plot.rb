class UpdateCorrelationPlot < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.create!(name: 'correlation_refinements',
                                default_value: false,
                                description: 'Whether to show refined correlation UI')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'correlation_refinements').destroy
  end
end
