# manage anonymous access to private studies via access code & pin
# will generate a short-lived session
class ReviewerAccess
  include Mongoid::Document
  include Mongoid::Timestamps

  field :access_code, type: String # UUID
  field :pin, type: String # 6 character string
  field :expires_at, type: Date, default: 2.months.from_now

  belongs_to :study
  has_many :reviewer_access_sessions, dependent: :delete_all do
    def by_session_key(session_key)
      find_by(session_key: session_key)
    end
  end

  before_validation :generate_credentials, on: :create
  validates :access_code, :pin, presence: true
  validates :study_id, uniqueness: true, presence: true

  # determine if user-supplied pin is valid
  def authenticate_pin?(pin_value)
    pin_value.to_s&.strip == pin
  end

  # user-readable timestamp
  def expiration_date
    expires_at.to_s(:long)
  end

  # check if access has expired (date-inclusive)
  def expired?
    Time.zone.today > expires_at
  end

  # determine if a specified ReviewerAccessSession is still valid
  # will default to false if session_key is not found
  def session_valid?(session_key)
    !reviewer_access_sessions.by_session_key(session_key)&.expired? || false
  end

  # rotate access credentials by generating a new access_code and pin
  def rotate_credentials
    generate_credentials
    save!
  end

  # create a new session and return
  def create_new_session
    session = reviewer_access_sessions.build
    session.save!
    session
  end

  private

  def generate_credentials
    self.access_code = SecureRandom.uuid
    self.pin = SecureRandom.hex(3).upcase
  end
end
