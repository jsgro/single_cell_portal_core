class AddMockPerfFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.create!(name: 'mock_viz_retrieval',
                                default_value: false,
                                description: 'whether to enable performance testing features')
    FeatureFlagMigrator.create!(name: 'postgres_viz_backend',
                                default_value: false,
                                description: 'whether mock viz data is pulled from a postgres backend')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'mock_viz_retrieval').destroy
    FeatureFlagMigrator.find_by(name: 'postgres_viz_backend').destroy
  end
end
