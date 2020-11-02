require 'simplecov_helper'

ENV["RAILS_ENV"] = "test"
require File.expand_path("../../config/environment", __FILE__)
require "rails/test_help"

# upload a large file (i.e. > 10MB) from the test_data directory to a study
# simulates chunked upload by streaming file in 10MB chunks and then uploading in series
def perform_chunked_study_file_upload(filename, study_file_params, study_id)
  source_file = File.open(Rails.root.join('test', 'test_data', filename))
  upload_response = nil
  while chunk = source_file.read(10.megabytes)
    file_upload = Rack::Test::UploadedFile.new(StringIO.new(chunk), original_filename: filename) # mock original_filename header
    study_file_params[:study_file].merge!(upload: file_upload)
    upload_response = patch "/single_cell/studies/#{study_id}/upload", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}
  end
  upload_response
end

# upload a file from the test_data directory to a study
def perform_study_file_upload(filename, study_file_params, study_id)
  file_upload = Rack::Test::UploadedFile.new(Rails.root.join('test', 'test_data', filename))
  study_file_params[:study_file].merge!(upload: file_upload)
  patch "/single_cell/studies/#{study_id}/upload", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}
end

# start parsing a file from the test_data directory to a study
def initiate_study_file_parse(filename, study_id)
  study_file_params = {file: filename}
  post "/single_cell/studies/#{study_id}/parse", params: study_file_params, headers: {'Content-Type' => 'multipart/form-data'}, xhr: true
end

# configure omniauth response for a given user
def auth_as_user(user)
  OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
                                                                         :provider => 'google_oauth2',
                                                                         :uid => user.uid,
                                                                         :email => user.email
                                                                     })
end

# count number of rows in BQ for this instance
def get_bq_row_count(bq_dataset, study)
  bq_dataset.query("SELECT COUNT(*) count FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE study_accession = '#{study.accession}'", cache: false)[0][:count]
end

# helper to seed some sample rows into BQ for testing purposes
def seed_bq_table(bq_dataset, study_accession, file_id)
  bq_seeds = File.open(Rails.root.join('db', 'seed', 'bq_seeds.json'))
  bq_data = JSON.parse bq_seeds.read
  bq_data.each do |entry|
    row = entry.with_indifferent_access
    row['CellID'] = SecureRandom.uuid
    row['study_accession'] = study_accession
    row['file_id'] = file_id.to_s
  end
  tmp_file = File.new(Rails.root.join('db', 'seeds', 'tmp_bq_seeds.json'), 'w+')
  tmp_file.write bq_data.map(&:to_json).join("\n")
  table = bq_dataset.table(CellMetadatum::BIGQUERY_TABLE)
  table.load tmp_file, write: 'append'
  tmp_file.close
  File.delete(tmp_file.path)
end

# helper to ensure there is data present in BQ
def ensure_bq_seeds(bq_dataset, study)
  if get_bq_row_count(bq_dataset, study) == 0
    seed_bq_table(bq_dataset, study.accession, study.metadata_file.id)
  end
end

