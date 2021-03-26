class AddPointsToClusterGroups < Mongoid::Migration
  def self.up
    ClusterGroup.all.each {|cluster| cluster.set_point_count }
  end

  def self.down
    ClusterGroup.all.each {|cluster| cluster.unset(:points) }
  end
end
