class RemoveSpatialFeatureFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.find_by(name: 'spatial_transcriptomics').destroy
  end

  def self.down
    FeatureFlagMigrator.create!(name: 'spatial_transcriptomics',
                                default_value: false,
                                description: 'whether to show spatial transcriptomics related features')
  end
end
