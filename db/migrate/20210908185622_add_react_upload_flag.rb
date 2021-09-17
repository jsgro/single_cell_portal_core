class AddReactUploadFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.create!(name: 'react_upload_wizard',
                                default_value: false,
                                description: 'show the react upload wizard component')
  end

  def self.down
    FeatureFlagMigrator.find_by(name: 'react_upload_wizard').destroy
  end
end
