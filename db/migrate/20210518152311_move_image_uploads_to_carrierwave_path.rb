# move any previously uploaded images not already inside 'original' version directory for Carrierwave to new location
class MoveImageUploadsToCarrierwavePath < Mongoid::Migration
  def self.up
    branding_images = UserAssetService.get_local_assets(asset_type: :branding_images)
    files_by_dir = {}
    branding_images.each do |pathname|
      dir_path, filename = pathname.split
      files_by_dir[dir_path] ||= []
      files_by_dir[dir_path] << filename
    end
    files_by_dir.each do |dir_path, files|
      folder_name = File.basename(dir_path)
      if folder_name != 'original'
        carrierwave_dir = dir_path.join('original')
        files.each do |file|
          current_path = dir_path.join(file)
          new_path = carrierwave_dir.join(file)
          FileUtils.mkdir_p(carrierwave_dir)
          FileUtils.mv(current_path, new_path)
        end
        # remove existing cached images at the deprecated path
        UserAssetService.remove_assets_from_remote("branding_groups/#{folder_name}")
      end
    end
    # back up all assets at correct paths
    UserAssetService.push_assets_to_remote(asset_type: :branding_images)
  end

  def self.down
  end
end
