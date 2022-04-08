# Stores information about files requested for a download and a corresponding auth. code
# Used mainly so the curl command given to users can be concise and not require excessive escape characters
class DownloadRequest

  include Mongoid::Document
  include Mongoid::Timestamps

  field :auth_code, type: String
  field :file_ids # Mongo ids of study files to download
  field :tdr_files, type: String # String representation of a hash of TDR project shortnames to arrays of access urls
  field :azul_files, type: String # String representation of a hash of Azul file summaries (Project Manifests, analysis_files, etc)
  field :user_id # User making the request

  before_save :sanitize_hashes

  ALLOWED_TRANSFORMS = %i[encode decode]

  # This is called before the data is saved to the DB to ensure the file hashes are encoded
  # in the way the DB can accept
  def sanitize_hashes 
    if self.azul_files.is_a?(Hash)
      self.tdr_files = self.class.transform_files(tdr_files, :encode)
      self.azul_files = self.class.transform_files(azul_files, :encode)
    end
  end
  
  # decode JSON-ified tdr files back into their original hash format
  def decoded_tdr_files
    self.class.transform_files(tdr_files, :decode)
  end

  # decode JSON-ified azul files back into their original hash format
  def decoded_azul_files
    self.class.transform_files(azul_files, :decode)
  end

  # helper to transform a hash to/from JSON for storage in the DB
  # transformation options are encode which will result in JSON-ifing the hash or
  # decode which will return the JSON-ified files back to thier original hash format
  # This is necessary to work around MongoDBs constraints on '.' and '$' in hash keys
  def self.transform_files(file_data, transform = :encode)  
    raise ArgumentError, "#{transform} is not a valid transform" unless ALLOWED_TRANSFORMS.include?(transform)
    file_data = transform.eql?(:encode) ? ActiveSupport::JSON.encode(file_data) : ActiveSupport::JSON.decode(file_data.gsub('=>', ':'))
    return file_data
    end
end
