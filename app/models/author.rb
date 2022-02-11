# store author-related info for studies
# will allow users to contact study authors directly with questions if author is listed as "corresponding"
# all authors will default to corresponding: false
# can also be used for search purposes
class Author
  include Mongoid::Document
  include Mongoid::Timestamps
  field :first_name, type: String
  field :last_name, type: String
  field :email, type: String
  field :institution, type: String
  field :corresponding, type: Mongoid::Boolean, default: false

  belongs_to :study

  validates_presence_of :first_name, :last_name, :email
end
