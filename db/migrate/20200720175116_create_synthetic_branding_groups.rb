class CreateSyntheticBrandingGroups < Mongoid::Migration
  def self.up
    SyntheticBrandingGroupPopulator.populate_all
  end

  def self.down
    SyntheticBrandingGroupPopulator.remove_all
  end
end
