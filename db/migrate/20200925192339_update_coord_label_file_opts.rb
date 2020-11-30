class UpdateCoordLabelFileOpts < Mongoid::Migration
  def self.up
    StudyFile.where(file_type: 'Coordinate Labels').each do |file|
      cluster_id = file.options['cluster_group_id']
      if cluster_id.present?
        cluster = ClusterGroup.find(cluster_id)
        file.options['cluster_file_id'] = cluster.study_file_id.to_s
        file.save!
      end
    end
  end

  def self.down
  end
end
