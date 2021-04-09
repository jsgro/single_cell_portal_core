require 'simplecov_helper'

ENV["RAILS_ENV"] = "test"
require File.expand_path("../../config/environment", __FILE__)
require "rails/test_help"

# from https://github.com/omniauth/omniauth/wiki/Integration-Testing
OmniAuth.config.test_mode = true

# upload a large file (i.e. > 10MB) from the test_data directory to a study
# simulates chunked upload by streaming file in 10MB chunks and then uploading in series
def perform_chunked_study_file_upload(filename, study_file_params, study_id)
  upload_response = nil
  File.open(Rails.root.join('test', 'test_data', filename)) do |source_file|
    while chunk = source_file.read(10.megabytes)
      file_upload = Rack::Test::UploadedFile.new(StringIO.new(chunk), original_filename: filename) # mock original_filename header
      study_file_params[:study_file].merge!(upload: file_upload)
      upload_response = patch "/single_cell/studies/#{study_id}/upload", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}
    end
  end
  upload_response
end

# upload a file from the test_data directory to a study
def perform_study_file_upload(filename, study_file_params, study_id)
  File.open(Rails.root.join('test', 'test_data', filename)) do |source_file|
    file_upload = Rack::Test::UploadedFile.new(source_file)
    study_file_params[:study_file].merge!(upload: file_upload)
    patch "/single_cell/studies/#{study_id}/upload", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}
  end
end

# start parsing a file from the test_data directory to a study
def initiate_study_file_parse(filename, study_id)
  study_file_params = {file: filename}
  post "/single_cell/studies/#{study_id}/parse", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}, xhr: true
end

# configure omniauth response for a given user
def auth_as_user(user, provider=:google)
  OmniAuth.config.mock_auth[provider] = OmniAuth::AuthHash.new({
                                                                         :provider => provider.to_s,
                                                                         :uid => user.uid,
                                                                         :email => user.email
                                                                     })
  user.update(provider: provider.to_s)
end
