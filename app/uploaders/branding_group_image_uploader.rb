class BrandingGroupImageUploader < CarrierWave::Uploader::Base
  include CarrierWave::Compatibility::Paperclip

  # Choose what kind of storage to use for this uploader:
  storage :file

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  def store_dir
    "single_cell/branding_groups/#{model.id}"
  end

  def cache_dir
    Rails.root.join('tmp', 'uploads')
  end

  def default_url(*args)
    "/single_cell/branding_groups/#{model.id}/#{model.send("#{mounted_as}_file_name")}"
  end

  # store the file size & content-type when uploading a file
  process :save_content_type_and_size_for_image

  def save_content_type_and_size_for_image
    model.send("#{mounted_as}_content_type=", file.content_type) if file.content_type
    model.send("#{mounted_as}_file_size=", file.size)
  end

  # set move_to_cache and move_to_store to true to perform a file move (i.e. mv file.txt), rather than copy
  # this is set to false in test environment to prevent moving test data files out of test/test_data that break
  # any downstream seeds/test that require these files
  def move_to_cache
    Rails.env.test? ? false : true
  end

  def move_to_store
    Rails.env.test? ? false : true
  end
end
