class UndoCovid19FlagDeletion < Mongoid::Migration
    # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    if FeatureFlagMigrator.find_by(name: 'covid19_page').nil?
      FeatureFlagMigrator.create!(name: 'covid19_page',
                          default_value: true,
                          description: 'whether to show the COVID-19 link on the homepage')
    end
  end

  def self.down
    # leave as is, since this is just a conditional restoration
  end
end
