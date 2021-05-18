class UploadUploader < CarrierWave::Uploader::Base
  include CarrierWave::Compatibility::Paperclip

  # Choose what kind of storage to use for this uploader:
  storage :file

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  def store_dir
    Rails.root.join('data', model.data_dir, model.id.to_s)
  end

  def cache_dir
    Rails.root.join('tmp', 'uploads')
  end

  # store the file size & content-type when uploading a file
  process :save_content_type_and_size_in_model

  def save_content_type_and_size_in_model
    model.upload_content_type = file.content_type if file.content_type && model.upload_content_type.blank?
    model.upload_file_size = model.upload_file_size.nil? ? file.size : model.upload_file_size += file.size
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
