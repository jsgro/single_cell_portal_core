class FeatureAnnouncement
  include Mongoid::Document
  include Mongoid::Timestamps
  field :title, type: String
  field :slug, type: String
  field :content, type: String
  field :doc_link, type: String
  field :published, type: Mongoid::Boolean, default: true

  validates :title, :slug, :content, presence: true, uniqueness: true
  before_validation :set_slug

  def display_date
    created_at.strftime('%F %r')
  end

  # helper to hide "New Features" button on the home page if there are no published announcements
  def self.published_features?
    where(published: true).any?
  end

  def self.per_page
    5
  end

  private

  def set_slug
    self.slug = self.title.downcase.gsub(/[^a-zA-Z0-9]+/, '-').chomp('-')
  end
end
