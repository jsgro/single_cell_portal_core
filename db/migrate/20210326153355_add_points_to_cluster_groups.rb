class AddPointsToClusterGroups < Mongoid::Migration
  def self.up
    # run in background to prevent delays on starting server after deployment
    ClusterGroup.delay.set_all_point_counts!
  end

  def self.down
    ClusterGroup.all.each {|cluster| cluster.unset(:points) }
  end
end
