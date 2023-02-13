class AnnDataFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :has_clusters, type: Boolean, default: false
  field :has_metadata, type: Boolean, default: false
  field :has_raw_counts, type: Boolean, default: false
  field :has_expression, type: Boolean, default: false
  # add obsm here probs
  #  add more stuff in here as needed too
end
