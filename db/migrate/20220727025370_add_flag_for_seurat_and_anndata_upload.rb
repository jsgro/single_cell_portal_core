class AddFlagForSeuratAndAnndataUpload < Mongoid::Migration
    # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
    class FeatureFlagMigrator
      include Mongoid::Document
      store_in collection: 'feature_flags'
      field :name, type: String
      field :default_value, type: Boolean, default: false
      field :description, type: String
    end
  
    def self.up
      FeatureFlagMigrator.create!(name: 'upload_seurat_and_anndata',
                                  default_value: false,
                                  description: 'allow AnnData and seurat file uploads in the upload wizard')
    end
  
    def self.down
      FeatureFlagMigrator.find_by(name: 'upload_seurat_and_anndata').destroy
    end
  end