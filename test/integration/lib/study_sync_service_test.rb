require 'test_helper'

class StudySyncServiceTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'StudySyncServiceTest',
                               user: @user,
                               test_array: @@studies_to_clean)
    @study_file = FactoryBot.create(:cluster_file,
                                    name: 'cluster_1.txt.gz',
                                    remote_location: 'cluster_1.txt.gz',
                                    study: @study)
  end

  # while we could employ mocks in this test, it somewhat defeats the purpose as every GCS function call needs to
  # be mocked in order for the test to run.  instead, we'll pay the overhead to create a real study and push a file
  # to the bucket to assert that headers are in fact being set correctly
  test 'should update content headers based on file content' do
    study = FactoryBot.create(:study,
                              name_prefix: 'StudySyncService Header Test',
                              user: @user,
                              test_array: @@studies_to_clean)
    gzipped_file = File.open(Rails.root.join('test/test_data/expression_matrix_example_gzipped.txt.gz'))
    study_file = StudyFile.create(name: 'expression_matrix_example_gzipped.txt.gz', file_type: 'Expression Matrix',
                                 upload: gzipped_file, remote_location: 'expression_matrix_example_gzipped.txt.gz',
                                 study: study)
    # override upload_content_type to simulate a gsutil upload
    study_file.update(upload_content_type: 'text/plain')
    client = ApplicationController.firecloud_client
    # push directly to bucket, and override content_type & content_encoding to simulate problems from gsutil/user error
    remote = client.create_workspace_file(study.bucket_id,
                                          gzipped_file.path,
                                          study_file.upload_file_name,
                                          content_type: 'text/plain',
                                          content_encoding: 'gzip')
    assert remote.present?
    assert_equal 'text/plain', remote.content_type
    assert_equal 'gzip', remote.content_encoding
    assert StudySyncService.fix_file_content_headers(study_file)
    updated_remote = client.get_workspace_file(study.bucket_id, study_file.bucket_location)
    assert_equal updated_remote.content_type, 'application/gzip'
    assert updated_remote.content_encoding.blank?
  end

  test 'should determine if file is gzipped' do
    # test for filename
    mock = Minitest::Mock.new
    mock.expect(:name, @study_file.name)
    assert StudySyncService.gzipped?(mock)
    mock.verify

    # test for content_type
    mock = Minitest::Mock.new
    mock.expect(:name, 'cluster_1.txt')
    mock.expect(:content_type, 'application/gzip')
    assert StudySyncService.gzipped?(mock)
    mock.verify

    # test for file content
    mock = Minitest::Mock.new
    gzipped_bytes = StringIO.new(StudyFile::GZIP_MAGIC_NUMBER)
    mock.expect(:name, 'cluster_1.txt')
    mock.expect(:content_type, 'text/plain')
    mock.expect(:download, gzipped_bytes, [{ range: 0..1, skip_decompress: true }])
    assert StudySyncService.gzipped?(mock)
    mock.verify

    # negative test
    mock = Minitest::Mock.new
    plain_bytes = StringIO.new('NA')
    mock.expect(:name, 'cluster_1.txt')
    mock.expect(:content_type, 'text/plain')
    mock.expect(:download, plain_bytes, [{ range: 0..1, skip_decompress: true }])
    assert_not StudySyncService.gzipped?(mock)
    mock.verify
  end
end
