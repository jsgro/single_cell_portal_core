class Base64EncodeCustomColorValues < Mongoid::Migration
  def self.up
    custom_colors = StudyFile.where(file_type: 'Cluster', :cluster_file_info.ne => nil)
    custom_colors.each do |study_file|
      cluster_info = study_file.cluster_file_info
      encoded_colors = ClusterFileInfo.transform_custom_colors(cluster_info.custom_colors)
      cluster_info.update(custom_colors: encoded_colors)
    end
  end

  def self.down
    custom_colors = StudyFile.where(file_type: 'Cluster', :cluster_file_info.ne => nil)
    custom_colors.each do |study_file|
      cluster_info = study_file.cluster_file_info
      decoded_colors = ClusterFileInfo.transform_custom_colors(cluster_info.custom_colors, :decode64)
      cluster_info.update(custom_colors: decoded_colors)
    end
  end
end
