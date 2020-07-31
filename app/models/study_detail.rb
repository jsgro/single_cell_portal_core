class StudyDetail
  include Mongoid::Document
  include Mongoid::Timestamps

  belongs_to :study

  field :full_description, type: String, default: ''

  after_save :set_study_description_text

  def plain_text_description
    ActionController::Base.helpers.strip_tags(self.full_description)
  end

  private

  # sets plain-text study description on saves
  def set_study_description_text
    self.study.update(description: self.plain_text_description)
  end
end
