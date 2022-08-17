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
                                    generation: '12345',
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

  test 'should CRUD shares from workspace ACL' do
    other_user = FactoryBot.create(:user, test_array: @@users_to_clean)
    workspace_acl = {
      acl: {
        'mock-scp-owner-group@firecloud.org' =>
          { accessLevel: 'OWNER', canCompute: true, canShare: true, pending: false },
        @user.email =>
          { accessLevel: 'WRITER', canCompute: true, canShare: true, pending: false },
        other_user.email =>
          { accessLevel: 'WRITER', canCompute: true, canShare: true, pending: false },
        ApplicationController.read_only_firecloud_client.issuer =>
          { accessLevel: 'READER', canCompute: true, canShare: true, pending: false }
      }
    }.with_indifferent_access
    mock = Minitest::Mock.new
    mock.expect(:get_workspace_acl, workspace_acl, [@study.firecloud_project, @study.firecloud_workspace])
    ApplicationController.stub :firecloud_client, mock do
      new_shares = StudySyncService.update_shares_from_acl(@study)
      assert new_shares.detect { |share| share.email == other_user.email && share.permission == 'Edit' }.present?
      mock.verify
    end
  end

  test 'should process all remote files' do

  end

  test 'should create directory listings from remotes' do

  end

  test 'should remove submission outputs from list' do
    submission_id = SecureRandom.uuid
    submissions = [{ submissionId: submission_id }.with_indifferent_access]
    api_mock = Minitest::Mock.new
    api_mock.expect(:get_workspace_submissions, submissions, [@study.firecloud_project, @study.firecloud_workspace])
    files = []
    5.times do
      mock = Minitest::Mock.new
      generation = SecureRandom.uuid
      mock.expect(:name, "#{submission_id}/outputs/#{SecureRandom.uuid}.txt")
      mock.expect(:generation, generation)
      mock.expect(:generation, generation)
      files << mock
    end
    study_file_mock = Minitest::Mock.new
    study_file_mock.expect(:name, 'matrix.tsv')
    generation = '1234567890123456'
    study_file_mock.expect(:generation, generation) # study file will only check generation once
    files << study_file_mock
    ApplicationController.stub :firecloud_client, api_mock do
      expected_files = StudySyncService.remove_submission_outputs(@study, files)
      api_mock.verify
      assert_equal expected_files, [study_file_mock]
      files.each(&:verify)
    end
  end

  test 'should remove synced files from list' do
    synced_mock = Minitest::Mock.new
    unsynced_mock = Minitest::Mock.new
    unsynced_generation = SecureRandom.uuid
    # an unsynced file will call :generation twice and then :name, whereas a synced file will call :generation 3 times
    # this is due to how the block evaluates in :remove_synced_files
    unsynced_mock.expect(:generation, unsynced_generation)
    unsynced_mock.expect(:generation, unsynced_generation)
    unsynced_mock.expect(:name, 'matrix.tsv')
    synced_mock.expect(:generation, @study_file.generation)
    synced_mock.expect(:generation, @study_file.generation)
    synced_mock.expect(:generation, @study_file.generation)
    files = [synced_mock, unsynced_mock]
    unsynced_files = StudySyncService.remove_synced_files(@study, files)
    assert_equal unsynced_files, [unsynced_mock]
    synced_mock.verify
    unsynced_mock.verify
  end

  test 'should remove directory files from list' do
    dir_files = []
    all_files = []
    10.times do
      dir_mock = Minitest::Mock.new
      generation = SecureRandom.uuid
      dir_mock.expect(:generation, generation)
      dir_mock.expect(:generation, generation)
      dir_files << dir_mock
      all_files << dir_mock
    end
    file_mock = Minitest::Mock.new
    generation = SecureRandom.uuid
    file_mock.expect(:generation, generation)
    all_files << file_mock
    non_dir_files = StudySyncService.remove_directory_files(dir_files, all_files)
    assert_equal non_dir_files, [file_mock]
    all_files.map(&:verify)
  end

  test 'should find orphaned files' do
    mock = Minitest::Mock.new
    mock.expect(:workspace_file_exists?, false,[@study.bucket_id, @study_file.bucket_location])
    ApplicationController.stub :firecloud_client, mock do
      orphaned = StudySyncService.find_orphaned_files(@study)
      assert_equal [@study_file], orphaned
      mock.verify
    end
  end
end
