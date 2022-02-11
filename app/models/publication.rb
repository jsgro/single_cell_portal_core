# store publication-related data for studies
# can provide links directly to journals, along with citation information
# can also be used for search purposes
class Publication
  include Mongoid::Document
  include Mongoid::Timestamps
  field :title, type: String
  field :journal, type: String
  field :pmcid, type: String # PubMed Central ID
  field :url, type: String # usually direct link to journal
  field :citation, type: String
  field :preprint, type: Mongoid::Boolean, default: false

  belongs_to :study

  validates_presence_of :title, :journal, :url

  # generate link to PubMed Central entry
  def pmc_link
    "https://www.ncbi.nlm.nih.gov/pmc/articles#{pmcid}"
  end
end
