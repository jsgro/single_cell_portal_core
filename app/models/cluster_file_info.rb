class ClusterFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :custom_colors, type: Hash, default: {}

  # decode base64 annotation/label names back into human-readable text
  def decoded_custom_colors
    self.class.transform_custom_colors(custom_colors, :decode64)
  end

  # helper to transform a nested custom color hash to/from base64
  def self.transform_custom_colors(hash, transform = :encode64)
    raise ArgumentError, "#{transform} is not a valid Base64 transform" unless Base64.respond_to?(transform)

    hash.map do |key, nested_hash|
      {
        Base64.send(transform, key) => nested_hash.map { |k, v| { Base64.send(transform, k) => v } }.reduce({}, :merge)
      }
    end.reduce({}, :merge)
  end

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

    # base64 endcode all keys to avoid MongoDB exception due to key names with periods (.) in them
    encoded_updates = transform_custom_colors(update_colors)

    # Consider validating that values are valid color hex codes, etc...
    previous_colors.merge(encoded_updates)
  end
end
