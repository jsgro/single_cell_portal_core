class BrandingGroup
  include Mongoid::Document
  include Mongoid::Timestamps
  include FeatureFlaggable

  field :name, type: String
  field :name_as_id, type: String
  field :tag_line, type: String
  field :background_color, type: String, default: '#FFFFFF'
  field :font_family, type: String, default: 'Helvetica Neue, sans-serif'
  field :font_color, type: String, default: '#333333'
  field :feature_flags, type: Hash, default: {}
  field :external_link_url, type: String
  field :external_link_description, type: String

  # list of facets to show for this branding group (will restrict to only provided identifiers, if present)
  field :facet_list, type: Array, default: []

  has_many :studies
  belongs_to :user

  field :splash_image_file_size, type: Integer
  field :splash_image_content_type, type: String
  field :footer_image_file_size, type: Integer
  field :footer_image_content_type, type: String
  field :banner_image_file_size, type: Integer
  field :banner_image_content_type, type: String

  # carrierwave settings
  mount_uploader :splash_image, SplashImageUploader, mount_on: :splash_image_file_name
  mount_uploader :banner_image, SplashImageUploader, mount_on: :banner_image_file_name
  mount_uploader :footer_image, SplashImageUploader, mount_on: :footer_image_file_name

  validates_presence_of :splash_image, :banner_image, :footer_image

  validates_presence_of :name, :name_as_id, :user_id, :background_color, :font_family
  validates_uniqueness_of :name
  validates_format_of :name, :name_as_id,
            with: ValidationTools::ALPHANUMERIC_SPACE_DASH, message: ValidationTools::ALPHANUMERIC_SPACE_DASH_ERROR

  validates_format_of :tag_line,
                      with: ValidationTools::OBJECT_LABELS, message: ValidationTools::OBJECT_LABELS_ERROR,
                      allow_blank: true
  validates_format_of :font_color, :font_family, :background_color, with: ValidationTools::ALPHANUMERIC_EXTENDED,
                      message: ValidationTools::ALPHANUMERIC_EXTENDED_ERROR

  before_validation :set_name_as_id
  before_destroy :remove_branding_association

  # helper to return list of associated search facets
  def facets
    self.facet_list.any? ? SearchFacet.where(:identifier.in => self.facet_list) : SearchFacet.visible
  end

  private

  def set_name_as_id
    self.name_as_id = self.name.downcase.gsub(/[^a-zA-Z0-9]+/, '-').chomp('-')
  end

  # remove branding association on delete
  def remove_branding_association
    self.studies.each do |study|
      study.update(branding_group_id: nil)
    end
  end
end
