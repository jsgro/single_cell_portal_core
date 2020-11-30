##
# DownloadAcceptance: tracks acceptance of DownloadAgreement for individual user & study.
# records the email & study_accession directly rather than relying on :belongs_to in case associated record is deleted
##
class DownloadAcceptance
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :download_agreement
  field :email, type: String
  field :study_accession, type: String

  before_validation :set_study_accession, on: :create

  validates_presence_of :email, :study_accession

  def user
    User.find_by(email: self.email)
  end

  def study
    self.download_agreement.study
  end

  private

  # set the study_accession for this download_acceptance
  # useful for provenance in case parent study/agreement is destroyed
  def set_study_accession
    self.study_accession = self.study.accession
  end
end
