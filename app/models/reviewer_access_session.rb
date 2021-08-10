# holds access credentials for an individual reviewer access session
# granted via ReviewerAccess
class ReviewerAccessSession
  include Mongoid::Document
  include Mongoid::Timestamps
  extend ActionView::Helpers::DateHelper # for distance_of_time_in_words

  field :session_key, type: String
  field :expires_at, type: DateTime

  belongs_to :reviewer_access
  before_validation :generate_session, on: :create

  validates :session_key, :expires_at, presence: true

  SESSION_DURATION = 4.hours.freeze

  # convert SESSION_DURATION into a human readable label, e.g. "4 hours"
  # trims off prepended "about "
  def self.session_duration_label
    distance_of_time_in_words(SESSION_DURATION).gsub(/about\s/, '')
  end

  # check if session has expired
  def expired?
    Time.now.in_time_zone > expires_at
  end

  # user-readable timestamp
  def expiration_time
    expires_at.strftime("%F %r")
  end

  private

  def generate_session
    self.session_key = SecureRandom.uuid
    self.expires_at = Time.now.in_time_zone + SESSION_DURATION
  end
end
