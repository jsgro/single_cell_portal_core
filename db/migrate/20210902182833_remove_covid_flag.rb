class RemoveCovidFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.find_by(name: 'covid19_page').destroy
    FeatureFlaggable.remove_flag_from_model(User, 'covid19_page')
    FeatureFlaggable.remove_flag_from_model(BrandingGroup, 'covid19_page')
  end

  def self.down
    FeatureFlagMigrator.create!(name: 'covid19_page',
                                default_value: true,
                                description: 'show covid 19 link on home page')
  end
end
