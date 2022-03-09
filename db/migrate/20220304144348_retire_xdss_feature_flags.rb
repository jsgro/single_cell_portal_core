class RetireXdssFeatureFlags < Mongoid::Migration
  def self.up
    FeatureFlag.retire_feature_flag('cross_dataset_search_backend')
    FeatureFlag.retire_feature_flag('cross_dataset_search_frontend')
  end

  def self.down
    FeatureFlag.create!(name: 'cross_dataset_search_backend',
                        default_value: true,
                        description: 'whether home page uses cross dataset search backend')
    FeatureFlag.create!(name: 'cross_dataset_search_frontend',
                        default_value: false,
                        description: 'whether home page uses cross dataset search UI')
  end
end
