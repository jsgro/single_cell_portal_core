class FeatureFlagOption
  include Mongoid::Document
  include Mongoid::Timestamps
  include Mongoid::History::Trackable
  field :value, type: Mongoid::Boolean, default: false

  belongs_to :feature_flaggable, polymorphic: true
  belongs_to :feature_flag

  validates :feature_flag, presence: true
  # only allow one FeatureFlagOption per parent model instance & parent FeatureFlag
  validates :feature_flag_id, uniqueness: {
    scope: %i[feature_flaggable_id feature_flaggable_type], message: 'already has an option set for this instance'
  }

  after_save :remove_default_value_options

  # get the default_value, name, and description from parent feature_flag
  delegate :default_value, to: :feature_flag
  delegate :name, to: :feature_flag
  delegate :description, to: :feature_flag

  # get associated model instance that this FeatureFlagOption maps to (e.g. User instance)
  # can call either flag_option.parent or flag_option.feature_flaggable
  alias parent feature_flaggable

  def to_h
    {
      name => value
    }.with_indifferent_access
  end

  # history tracking, will also record when option was removed (e.g. manually deleted, or feature flag retired)
  track_history on: %i[value], modifier_field: nil, track_destroy: true

  private

  # callback to self-delete any options that have a blank "value", meaning that an admin has set this option back
  # to the "default" for the parent feature flag
  def remove_default_value_options
    destroy if value.blank?
  end
end
