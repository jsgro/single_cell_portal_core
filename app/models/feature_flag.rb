class FeatureFlag

  ###
  #
  # FeatureFlag: stores global default values for feature flags
  #
  ###

  include Mongoid::Document

  field :name, type: String
  field :default_value, type: Boolean, default: false
  field :description, type: String

  validates_uniqueness_of :name

  # return a hash of name => default for all flags
  def self.default_flag_hash
    FeatureFlag.all.inject({}) do |hash, flag|
      hash[flag.name] = flag.default_value
      hash.with_indifferent_access
    end
  end

  # 'retire' a feature flag and remove all per-model flag values to prevent FeatureFlaggable#validate_feature_flags
  # from throwing an error when trying to update existing feature flags
  def self.retire_feature_flag(name)
    feature_flag = FeatureFlag.find_by(name: name)
    raise NameError, "FeatureFlag: '#{name}' does not exist" if feature_flag.blank?

    # call Rails.application.eager_load! to ensure all classes are loaded in development
    Rails.application.eager_load! if Rails.env.development?

    # use FeatureFlaggable#remove_flag_from_model to remove all per-model instances of the flag
    # use Mongoid.models to iterate over all SCP-defined models to see if they include the FeatureFlaggable module
    Mongoid.models.each do |model|
      next unless model.include? FeatureFlaggable

      FeatureFlaggable.remove_flag_from_model(model, name)
    end
    feature_flag.destroy
  end
end
