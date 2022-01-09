require 'test_helper'

class DelayedJobAccessorTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study, name_prefix: 'DelayedJobAccessor Study', test_array: @@studies_to_clean)
    @study_file = FactoryBot.create(:study_file, name: 'dense.txt', file_type: 'Expression Matrix', study: @study)
  end

  setup do
    run_at = 10.minutes.from_now.in_time_zone
    # queue job
    @job = Delayed::Job.enqueue(UploadCleanupJob.new(@study, @study_file, 0), run_at: run_at)
  end

  teardown do
    @job.destroy
  end

  test 'should load job instances from queue' do
    jobs = DelayedJobAccessor.find_jobs_by_handler_type(UploadCleanupJob, @study_file)
    assert jobs.any?, "Did not find any jobs when there should have been at least 1"
  end

  test 'should decode job handler' do
    handler = DelayedJobAccessor.dump_job_handler(@job)
    handler_file_attributes = handler.study_file['attributes']
    assert_equal @study_file.attributes, handler_file_attributes,
                 "Study File attributes do not match: #{@study_file.attributes} != #{handler_file_attributes}"
  end

  test 'should correctly match object instance from handler' do
    handler = DelayedJobAccessor.dump_job_handler(@job)
    assert DelayedJobAccessor.match_handler_to_object(handler, UploadCleanupJob, @study_file)

    new_file = @study.study_files.build(file_type: 'Other')
    assert_not DelayedJobAccessor.match_handler_to_object(handler, UploadCleanupJob, new_file)
  end
end
