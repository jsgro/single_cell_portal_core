class DownloadAcceptance
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :download_agreement
  field :email, type: String

  validates_presence_of :email

  def user
    User.find_by(email: self.email)
  end

  def study
    self.download_agreement.study
  end
end
