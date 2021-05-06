class CacheAllStudyDefaults < Mongoid::Migration
  def self.up
    ClusterCacheService.delay(queue: :cache).cache_all_defaults
  end

  def self.down
  end
end
