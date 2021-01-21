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

end
