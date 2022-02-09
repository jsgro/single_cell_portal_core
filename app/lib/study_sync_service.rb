# collection of methods to be called during sync actions
class StudySyncService
  # handle setting the metadata headers for a GCS resource (e.g. file)
  # this is used mainly to address issues when a user has directly pushed a file to a bucket via gsutil
  # which can result in headers are not being set correctly that causes downstream issues when localizing files
  #
  # * *params*
  #   - +file+ (Google::Cloud::Storage::File) => remote GCS file in workspace bucket
  #
  # * *returns*
  #  - (Google::Cloud::Storage::File)
  def self.fix_file_content_headers(file)
    return file unless file.is_a?(Google::Cloud::Storage::File) && gzipped?(file) # uncompressed files need no updates

    Rails.logger.info "correcting headers on unsynced file #{file.name} in #{file.bucket}"
    # determine what headers need to be changed, if any
    case file.content_type
    when /text/
      Rails.logger.info "setting #{file.name} content_encoding to gzip based on content_type: #{file.content_type}"
      file.content_encoding = 'gzip'
    when /gzip/
      Rails.logger.info "setting #{file.name} content_type to application/octet-stream, clearing content_encoding " \
                        "based on content_type: #{file.content_type}"
      # use block-style update for single PATCH request
      file.update do |f|
        f.content_type = 'application/octet-stream'
        f.content_encoding = ''
      end
    when 'application/octet-stream'
      Rails.logger.info "unsetting #{file.name} content_encoding based on content_type: #{file.content_type}"
      file.content_encoding = ''
    else
      Rails.logger.info "skipping #{file.name} header correction due to unexpected content_type: #{file.content_type}"
    end
    file
  end

  # tell if a file has been gzipped
  #
  # * *params*
  #   - +file+ (Google::Cloud::Storage::File) => remote GCS file in workspace bucket
  #
  # * *returns*
  #  - (Boolean)
  def self.gzipped?(file)
    return true if file.name&.end_with?('.gz') || file.content_type == 'application/gzip'

    # read first two bytes into memory and check against StudyFile::GZIP_MAGIC_NUMBER
    begin
      first_two_bytes = file.download(range: 0..1, skip_decompress: true)
      first_two_bytes.rewind
      first_two_bytes.read == StudyFile::GZIP_MAGIC_NUMBER
    rescue => e
      Rails.logger.error "error checking gzip status on #{file.name}"
      ErrorTracker.report_exception(e, nil, file)
      false # we don't really know, so return false to halt execution
    end
  end
end
