class RemoveReactExploreFeatureFlag < Mongoid::Migration
  def self.up
    FeatureFlag.retire_feature_flag('react_explore')
  end

  def self.down
    FeatureFlag.create!(name: 'react_explore',
                        default_value: false,
                        description: 'whether the explore tab should use the new React functionality')
  end
end
