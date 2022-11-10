class AddFeatureFlagForIngestingAnndata < Mongoid::Migration
    # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
    class FeatureFlagMigrator
      include Mongoid::Document
      store_in collection: 'feature_flags'
      field :name, type: String
      field :default_value, type: Boolean, default: false
      field :description, type: String
    end
  
    def self.up
      FeatureFlagMigrator.create!(name: 'add_feature_flag_for_ingesting_anndata',
                                  default_value: false,
                                  description: 'Feature flag to allow annData ingest or not')
    end
  
    def self.down
      FeatureFlagMigrator.find_by(name: 'add_feature_flag_for_ingesting_anndata').destroy
    end
  end
  