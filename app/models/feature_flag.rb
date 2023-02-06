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
  field :enable_ab_test, type: Boolean, default: false

  # pointer to all per-model feature_flag_options, will delete all if this flag is removed
  has_many :feature_flag_options, dependent: :delete_all, primary_key: :name, foreign_key: :name
  has_many :ab_test_assignments, dependent: :delete_all

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

    # remove all configure options on model instances, then destroy parent flag
    # this has better performance than allowing the destroy callback to remove feature_flag_option instances
    feature_flag.feature_flag_options.delete_all
    feature_flag.destroy
  end

  # load A/B test assignments for all enabled feature_flags for a given metrics_uuid
  # filter out any instances where the FeatureFlagOption is set as this will skew results
  def self.load_ab_test_assignments(metrics_uuid)
    return [] if metrics_uuid.nil?

    where(enable_ab_test: true).map do |feature_flag|
      AbTestAssignment.find_or_create_by(feature_flag:, metrics_uuid:)
    end.reject(&:flag_override?).map(&:tag)
  end
end
