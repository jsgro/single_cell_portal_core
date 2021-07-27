# Stores information about files requested for a download and a corresponding auth. code
# Used mainly so the curl command given to users can be concise and not require excessive escape characters
class DownloadRequest

  include Mongoid::Document
  include Mongoid::Timestamps

  field :auth_code, type: String
  field :file_ids # Mongo ids of study files to download
  field :tdr_files, type: Hash, default: {} # Hash of TDR project shortnames to arrays of access urls
  # Hash of HCA project shortnames to UUIDs of HCA projects for requesting metadata manifests
  field :hca_projects, type: Hash, default: {}
  field :user_id # User making the request
end
