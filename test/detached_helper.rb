# helper to mock a study not being detached
# useful for when we don't really need a workspace
def mock_not_detached(study, find_method, &block)
  Study.stub find_method, study do
    study.stub :detached?, false, &block
  end
end

# mock array of studies not being detached
# useful in bulk download/search tests
def mock_query_not_detached(studies, &block)
  Study.stub :where, studies do
    Study.stub :find_by, studies.first, &block
  end
end

# generate a mock with all necessary signed_url calls for an array of files to use with detached study
def generate_signed_urls_mock(study_files, parent_study: nil)
  urls_mock = Minitest::Mock.new
  study_files.each do |file|
    study = parent_study || file.study
    location = file.try(:bucket_location) || file
    mock_signed_url = "https://www.googleapis.com/storage/v1/b/#{study.bucket_id}/#{location}"
    urls_mock.expect :execute_gcloud_method,
                     mock_signed_url,
                     [:generate_signed_url, 0, String, String, Hash]
  end
  urls_mock
end
