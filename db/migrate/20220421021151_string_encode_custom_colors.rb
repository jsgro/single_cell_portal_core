class StringEncodeCustomColors < Mongoid::Migration
  def self.up
    # convert base64 encoded hashes to hashes-as-strings
    StudyFile.where(file_type: 'Cluster', :'cluster_file_info.custom_colors'.ne => nil).each do |study_file|
      cluster_info = study_file.cluster_file_info
      encoded_color_hash = JSON.parse(cluster_info.custom_colors.gsub('=>', ':'))
      custom_color_hash = StringEncodeCustomColors.base64_transform(encoded_color_hash, :decode64)
      cluster_info.update!(custom_colors: custom_color_hash)
    end
  end

  def self.down
    # convert hashes-as-strings to base64 encoded strings
    StudyFile.where(file_type: 'Cluster', :'cluster_file_info.custom_colors'.ne => nil).each do |study_file|
      cluster_info = study_file.cluster_file_info
      custom_color_hash = JSON.parse(cluster_info.custom_colors.gsub('=>', ':'))
      cluster_info.update!(custom_colors: StringEncodeCustomColors.base64_transform(custom_color_hash, :encode64))
    end
  end

  # helper to transform a nested custom color hash to/from base64
  def self.base64_transform(hash, transform)
    hash.map do |key, nested_hash|
      {
        Base64.send(transform, key) => nested_hash.map { |k, v| { Base64.send(transform, k) => v } }.reduce({}, :merge)
      }
    end.reduce({}, :merge)
  end
end