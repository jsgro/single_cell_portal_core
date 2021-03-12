# helper to construct a bulk download response objects based off of a collection of files
# used for validating API responses
def bulk_download_response(study_files)
  response = {}
  study_files.each do |study_file|
    file_type = study_file.simplified_file_type
    response[file_type] ||= {total_files: 0, total_bytes: 0}
    response[file_type][:total_files] += 1
    response[file_type][:total_bytes] += study_file.upload_file_size
  end
  response.with_indifferent_access
end

# take response from bulk_download_response or API response and return total file count
def get_file_count_from_response(response)
  response.values.map {|entry| entry[:total_files]}.reduce(&:+)
end

def get_file_size_from_response(response)
  response.values.map {|entry| entry[:total_bytes]}.reduce(&:+)
end
