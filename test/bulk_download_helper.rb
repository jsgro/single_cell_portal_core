# helper to construct a bulk download response object based off of a collection of files
# used for validating API responses

def bulk_download_response(study_files)
  response = {}
  study_files.each do |study_file|
    format_file_for_response(response, study_file)
    if study_file.is_bundled?
      study_file.bundled_files.each do |bundled_file|
        format_file_for_response(response, bundled_file)
      end
    end
    response.with_indifferent_access
  end
end

private

def format_file_for_response(response_object, file)
  file_type = file.simplified_file_type
  response_object[file_type] ||= {total_files: 0, total_bytes: 0}
  response_object[file_type][:total_files] += 1
  response_object[file_type][:total_bytes] += file.upload_file_size
end
