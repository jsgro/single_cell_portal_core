class ModifiableFeatureFlag < Mongoid::Migration
  def self.up
    FeatureFlag.find_by(name: 'faceted_search').update!(user_modifiable: true)
  end

  def self.down
  end
end
