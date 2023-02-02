# reference document to map a user/metrics_uuid to a feature_flag A/B test group
class AbTestSession
  include Mongoid::Document
  include Mongoid::Timestamps

  # use declarative labels so reports are clear what each group saw
  GROUP_NAMES = %w[control experiment].freeze
  belongs_to :feature_flag
  belongs_to :user, optional: true, foreign_key: :metrics_uuid, primary_key: :metrics_uuid, dependent: :delete_all

  field :metrics_uuid, type: String
  field :group_name, type: String

  validates :metrics_uuid, uniqueness: { scope: :feature_flag_id }, presence: true
  validates :group_name, presence: true, inclusion: { in: GROUP_NAMES }
  before_validation :assign_group, on: :create

  def self.random_group
    rand.round.zero? ? GROUP_NAMES.first : GROUP_NAMES.last
  end

  def session_tag
    "#{feature_flag.name.dasherize}-group-#{group_name}".downcase
  end

  # determine if a user has a FeatureFlagOption override in place
  # this would override what happens in the UI so we need to account for this when reporting groups
  def flag_override?
    user.nil? ? false : user.flag_configured?(feature_flag.name)
  end

  private

  def assign_group
    self.group_name = self.class.random_group
  end
end
