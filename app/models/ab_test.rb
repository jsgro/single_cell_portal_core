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

  validate :no_spaces_in_group_names
  validate :two_groups?
  after_save :unset_orphaned_groups

  def random_group
    group_names.sample
  end

  def assignment(metrics_uuid)
    AbTestAssignment.find_or_create_by(feature_flag:, metrics_uuid:, ab_test: self)
  end

  def user_count(group_name)
    ab_test_assignments.where(group_name:).count
  end

  # load A/B test assignments for all enabled A/B tests using a given metrics_uuid
  # filter out any instances where the FeatureFlagOption is set as this will skew results
  def self.load_assignments(metrics_uuid)
    return [] if metrics_uuid.nil?

    where(enabled: true).map { |ab_test| ab_test.assignment(metrics_uuid) }.reject(&:flag_override?).map(&:tag)
  end

  private

  def no_spaces_in_group_names
    invalid_names = group_names.map { |name| name.match(/\s/) }.compact
    if invalid_names.any?
      errors.add(:group_names,
                 "cannot contain values with spaces: #{invalid_names.map {|n| "'#{n.string}'"}.join(',')}")
    end
  end

  def two_groups?
    if group_names.count < 2
      errors.add(:group_names, 'must have at least two groups')
    end
  end

  # remove any assignments to groups that have been removed
  # users will automatically get reassigned to a new group on page load
  def unset_orphaned_groups
    assigned_groups = ab_test_assignments.pluck(:group_name).uniq
    orphaned_groups = assigned_groups - group_names
    if orphaned_groups.any?
      ab_test_assignments.where(:group_name.in => orphaned_groups).delete_all
    end
  end
end
