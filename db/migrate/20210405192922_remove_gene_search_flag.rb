class RemoveGeneStudyFilterFlag < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class FeatureFlagMigrator
    include Mongoid::Document
    store_in collection: 'feature_flags'
    field :name, type: String
    field :default_value, type: Boolean, default: false
    field :description, type: String
  end

  def self.up
    FeatureFlagMigrator.find_by(name: 'gene_study_filter').destroy
    FeatureFlaggable.remove_flag_from_model(User, 'gene_study_filter')
    FeatureFlaggable.remove_flag_from_model(BrandingGroup, 'gene_study_filter')
  end

  def self.down
    FeatureFlagMigrator.create!(name: 'gene_study_filter',
                                default_value: false,
                                description: 'whether global gene search can be narrowed by a study filter')
  end
end
