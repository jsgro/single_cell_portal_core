# holds groups names for running A/B UI tests
# supports 2+ group assignments
class AbTest
  include Mongoid::Document
  include Mongoid::Timestamps

  has_many :ab_test_assignments, dependent: :delete_all
  belongs_to :feature_flag

  DEFAULT_GROUP_NAMES = %w[control intervention].freeze

  field :group_names, type: Array, default: DEFAULT_GROUP_NAMES
  field :enabled, type: Boolean, default: false

  def random_group
    group_names.sample
  end

  def assignment(metrics_uuid)
    AbTestAssignment.find_or_create_by(feature_flag:, metrics_uuid:, ab_test: self)
  end

  # load A/B test assignments for all enabled A/B tests using a given metrics_uuid
  # filter out any instances where the FeatureFlagOption is set as this will skew results
  def self.load_assignments(metrics_uuid)
    return [] if metrics_uuid.nil?

    where(enabled: true).map { |ab_test| ab_test.assignment(metrics_uuid) }.reject(&:flag_override?).map(&:tag)
  end
end
