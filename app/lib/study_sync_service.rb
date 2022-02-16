# collection of methods to be called during sync actions
class StudySyncService
  # handle setting the content metadata headers (Content-Type, Content-Encoding) for a GCS resource (e.g. file)
  # this is used mainly to address issues when a user has directly uploaded a file to a bucket via gsutil which can
  # result in headers are not being set correctly that causes downstream issues when localizing files for parsing
  #
  # * *params*
  #   - +study_file+ (StudyFile) => recently synced StudyFile
  #
  # * *returns*
  #  - (Boolean) => T/F on whether headers were changed
  def self.fix_file_content_headers(study_file)
    return false unless study_file.is_a?(StudyFile) && study_file.study.present? && study_file.parseable?

    study = study_file.study
    file = ApplicationController.firecloud_client.get_workspace_file(study.bucket_id, study_file.bucket_location)
    return false unless gzipped?(file) && study_file.remote_location.present? # skip uncompressed & SCP UI uploaded files

    # at this point, we know the file is gzipped, and was not uploaded through the SCP UI
    # set content_type to application/gzip and ensure there is no content_encoding header
    # this mimics what happens when a user uploads a gzipped file through either the SCP or GCS UI
    Rails.logger.info "correcting headers on synced file #{file.name} (#{file.content_type}) in #{file.bucket}"
    file.update do |f|
      f.content_type = 'application/gzip'
      f.content_encoding = ''
    end

    Rails.logger.info "headers updated on #{file.name} to content_type: #{file.content_type}, " \
                      "content_encoding: #{file.content_encoding}"
    true
  end

  # tell if a file has been gzipped
  #
  # * *params*
  #   - +file+ (Google::Cloud::Storage::File) => remote GCS file in workspace bucket
  #
  # * *returns*
  #  - (Boolean)
  def self.gzipped?(file)
    if file.name&.end_with?('.gz') || file.content_type == 'application/gzip'
      return true
    end

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
