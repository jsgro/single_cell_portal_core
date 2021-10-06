class RemoveFacetedSearchFeatureFlag < Mongoid::Migration
  def self.up
    FeatureFlag.retire_feature_flag('faceted_search')
  end

  def self.down
    FeatureFlag.create!(name: 'faceted_search',
                        default_value: false,
                        description: 'whether to show the facet controls in the advanced search')
  end
end
