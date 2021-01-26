require 'test_helper'

class IngestJobTest < ActiveSupport::TestCase

  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study, name_prefix: 'IngestJob Test', test_array: @@studies_to_clean)

    @basic_study_exp_file = FactoryBot.create(:study_file,
                                              name: 'dense.txt',
                                              file_type: 'Expression Matrix',
                                              study: @basic_study)

    @pten_gene = FactoryBot.create(:gene_with_expression,
                                   name: 'PTEN',
                                   study_file: @basic_study_exp_file,
                                   expression_input: [['A', 0],['B', 3],['C', 1.5]])
    @basic_study_exp_file.build_expression_file_info(is_raw_counts: false, library_preparation_protocol: 'MARS-seq',
                                                     modality: 'Transcriptomic: unbiased', biosample_input_type: 'Whole cell')
    @basic_study_exp_file.parse_status = 'parsed'
    @basic_study_exp_file.upload_file_size = 1024
    @basic_study_exp_file.save!

    # insert "all cells" array for this expression file
    DataArray.create!(study_id: @basic_study.id, study_file_id: @basic_study_exp_file.id, values: %w(A B C),
                      name: "#{@basic_study_exp_file.name} Cells", array_type: 'cells', linear_data_type: 'Study',
                      linear_data_id: @basic_study.id, array_index: 0, cluster_name: @basic_study_exp_file.name)

    @other_matrix = FactoryBot.create(:study_file,
                                       name: 'dense_2.txt',
                                       file_type: 'Expression Matrix',
                                       study: @basic_study)
    @other_matrix.build_expression_file_info(is_raw_counts: false, library_preparation_protocol: 'MARS-seq',
                                             modality: 'Transcriptomic: unbiased', biosample_input_type: 'Whole cell')
    @other_matrix.upload_file_size = 2048
    @other_matrix.save!
  end

  test 'should hold ingest until other matrix validates' do

    ingest_job = IngestJob.new(study: @basic_study, study_file: @other_matrix, action: :ingest_expression)
    assert ingest_job.can_launch_ingest?, "Should be able to launch ingest job but can_launch_ingest? returned false"

    # simulate parse job is underway, but file has already validated
    @basic_study_exp_file.update_attributes!(parse_status: 'parsing')
    concurrent_job = IngestJob.new(study: @basic_study, study_file: @other_matrix, action: :ingest_expression)
    assert concurrent_job.can_launch_ingest?,
           "Should be able to launch ingest job of concurrent parse but can_launch_ingest? returned false"

    # simulate parse job has not started by removing parsed data
    DataArray.where(study_id: @basic_study.id, study_file_id: @basic_study_exp_file.id).delete_all
    Gene.where(study_id: @basic_study.id, study_file_id: @basic_study_exp_file.id).delete_all
    queued_job = IngestJob.new(study: @basic_study, study_file: @other_matrix, action: :ingest_expression)
    refute queued_job.can_launch_ingest?,
           "Should not be able to launch ingest job of queued parse but can_launch_ingest? returned true"

    # simulate new matrix is "older" by backdating created_at by 1 week
    @other_matrix.update_attributes!(created_at: 1.week.ago.in_time_zone)
    backdated_job = IngestJob.new(study: @basic_study, study_file: @other_matrix, action: :ingest_expression)
    assert backdated_job.can_launch_ingest?,
           "Should be able to launch ingest job of backdated parse but can_launch_ingest? returned false"

    # ensure other matrix types are not gated
    raw_counts_matrix = FactoryBot.create(:study_file,
                                          name: 'raw.txt',
                                          file_type: 'Expression Matrix',
                                          study: @basic_study)
    raw_counts_matrix.build_expression_file_info(is_raw_counts: true, units: 'raw counts',
                                                 library_preparation_protocol: 'MARS-seq',
                                                 modality: 'Transcriptomic: unbiased', biosample_input_type: 'Whole cell')

    raw_counts_matrix.save!
    raw_counts_ingest = IngestJob.new(study: @basic_study, study_file: raw_counts_matrix, action: :ingest_expression)
    assert raw_counts_ingest.can_launch_ingest?,
           "Should be able to launch raw counts ingest job but can_launch_ingest? returned false"

  end

  test 'should gather job properties to report to mixpanel' do
    # positive test
    job = IngestJob.new(study: @basic_study, study_file: @basic_study_exp_file, user: @user, action: :ingest_expression)
    mock = Minitest::Mock.new
    now = DateTime.now.in_time_zone
    mock_metadata = {
      events: [
        {timestamp: now.to_s},
        {timestamp: (now + 1.minute).to_s}
      ]
    }.with_indifferent_access
    mock.expect :metadata, mock_metadata
    mock.expect :error, nil

    ApplicationController.papi_client.stub :get_pipeline, mock do
      expected_outputs = {
        perfTime: 60000,
        fileType: @basic_study_exp_file.file_type,
        fileSize: @basic_study_exp_file.upload_file_size,
        action: :ingest_expression,
        studyAccession: @basic_study.accession,
        jobStatus: 'success',
        numGenes: @basic_study.genes.count,
        numCells: @basic_study.expression_matrix_cells(@basic_study_exp_file).count
      }.with_indifferent_access

      job_analytics = job.get_job_analytics
      mock.verify
      assert_equal expected_outputs, job_analytics
    end

    # negative test
    job = IngestJob.new(study: @basic_study, study_file: @other_matrix, user: @user, action: :ingest_expression)
    mock = Minitest::Mock.new
    now = DateTime.now.in_time_zone
    mock_metadata = {
      events: [
        {timestamp: now.to_s},
        {timestamp: (now + 2.minutes).to_s}
      ]
    }.with_indifferent_access
    mock.expect :metadata, mock_metadata
    mock.expect :error, {code: 1, message: 'mock message'} # simulate error

    ApplicationController.papi_client.stub :get_pipeline, mock do
      expected_outputs = {
        perfTime: 120000,
        fileType: @other_matrix.file_type,
        fileSize: @other_matrix.upload_file_size,
        action: :ingest_expression,
        studyAccession: @basic_study.accession,
        jobStatus: 'failed',
        numGenes: 0,
        numCells: 0
      }.with_indifferent_access

      job_analytics = job.get_job_analytics
      mock.verify
      assert_equal expected_outputs, job_analytics
    end
  end
end
