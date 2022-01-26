class ClusterFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :custom_colors, type: Hash, default: {}

  # merges in a color update to the custom_colors hash
  # all colors for the given annotations will be overwritten,
  # but annotations not listed in update_colors will be unchanged
  # e.g. if custom_colors = {
  #  'annot1': {'label1': '#ee1166'},
  #  'annot2': {'foo': '#336677'}
  # }
  # merge_color_updates(file, { 'annot1': { 'label2': '#334499'}}) will delete the prior custom color for label1
  # but will leave the entry for 'annot2' unchanged.
  def self.merge_color_updates(study_file, update_colors)
    previous_colors = study_file.cluster_file_info&.custom_colors || {}

    # Consider validating that values are valid color hex codes, etc...
    previous_colors.merge(update_colors)
  end
end
