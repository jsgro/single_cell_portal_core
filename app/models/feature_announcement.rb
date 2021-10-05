class FeatureAnnouncement
  include Mongoid::Document
  include Mongoid::Timestamps
  field :title, type: String
  field :slug, type: String
  field :content, type: String
  field :doc_link, type: String
  field :published, type: Mongoid::Boolean, default: true
  field :archived, type: Mongoid::Boolean, default: false

  validates :title, :content, presence: true
  validates :slug, uniqueness: true, presence: true
  before_validation :set_slug

  def display_date
    created_at.strftime('%F %r')
  end

  def self.published
    where(published: true, archived: false)
  end

  def self.archived
    where(published: true, archived: true)
  end

  # helper to hide "New Features" button on the home page if there are no published announcements
  def self.published_features?
    published.any?
  end

  def self.archived_features?
    archived.any?
  end

  def self.per_page
    5
  end

  private

  def set_slug
    today = created_at.nil? ? Date.today.in_time_zone : created_at
    self.slug = "#{today.strftime('%F')}-#{title.downcase.gsub(/[^a-zA-Z0-9]+/, '-').chomp('-')}"
  end
end
