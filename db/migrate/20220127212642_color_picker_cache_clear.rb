class ColorPickerCacheClear < Mongoid::Migration
  def self.up
    # clear the cache since this makes changes to the clusters API signature -- editing colors cannot work if the cluster
    # file id is not included in the response
    Rails.cache.clear
  end

  def self.down
  end
end