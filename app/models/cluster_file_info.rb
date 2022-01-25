class ClusterFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :custom_colors, type: Hash, default: {}

  def self.merge_color_updates(study_file, params)
    update_colors = JSON.parse(params[:custom_color_updates])
    previous_colors = study_file.cluster_file_info&.custom_colors || {}

    # Consider validating that values are valid color hex codes, etc...

    new_colors =  previous_colors.merge(update_colors)
    params['cluster_file_info'] = {custom_colors: new_colors}
    params.delete(:custom_color_updates)
  end
end
