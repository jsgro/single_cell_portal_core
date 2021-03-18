class RemoveSpatialFlag2 < Mongoid::Migration
  def self.up
    FeatureFlaggable.remove_flag_from_model(User, 'spatial_transcriptomics')
    FeatureFlaggable.remove_flag_from_model(BrandingGroup, 'spatial_transcriptomics')
  end

  def self.down
    # we're not remembering which users had this feature, so there's no way to undo
  end
end
