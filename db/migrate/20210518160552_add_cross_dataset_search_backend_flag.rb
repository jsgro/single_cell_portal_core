class AddCrossDatasetSearchBackendFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.create!(name: 'cross_dataset_search_backend',
                                default_value: false,
                                description: 'whether home page uses cross dataset search backend')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'cross_dataset_search_backend').destroy
  end
end
