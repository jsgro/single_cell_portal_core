class ClusterFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :custom_colors, type: Hash, default: {}

  # Consider validating that values are valid color hex codes
  # before_validation :sanitize_raw_counts_associations
end
