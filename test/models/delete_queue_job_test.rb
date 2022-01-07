require 'test_helper'

class DeleteQueueJobTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study, name_prefix: 'DeleteQueue Test', test_array: @@studies_to_clean)

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
    @basic_study_exp_file.save!
  end

  # test to ensure expression matrix files with "invalid" expression_file_info documents can still be deleted
  # this happens when attributes on nested documents have new constraints placed after creation, like additional
  # validations or fields
  test 'should allow deletion of legacy expression matrices' do
    assert @basic_study_exp_file.valid?,
           "Expression file should be valid but is not: #{@basic_study_exp_file.errors.full_messages}"
    assert @basic_study.genes.count == 1,
           "Did not find correct number of genes, expected 1 but found #{@basic_study.genes.count}"

    # manually unset an attribute for expression_file_info to simulate "legacy" data
    @basic_study_exp_file.expression_file_info.modality = nil
    @basic_study_exp_file.save(validate: false)
    @basic_study_exp_file.reload
    assert_nil @basic_study_exp_file.expression_file_info.modality,
               "Did not unset value for modality: #{@basic_study_exp_file.expression_file_info.modality}"

    # run DeleteQueueJob and ensure proper deletion
    DeleteQueueJob.new(@basic_study_exp_file).perform
    @basic_study_exp_file.reload
    @basic_study.reload

    assert @basic_study_exp_file.queued_for_deletion,
           "Did not successfully queue exp matrix for deletion: #{@basic_study_exp_file.queued_for_deletion}"

    assert_equal @basic_study.genes.count, 0, "Should not have found any genes but found #{@basic_study.genes.count}"
  end

  test 'should allow reuse of filename after deletion' do
    filename = 'exp_matrix.txt'
    matrix = FactoryBot.create(:study_file, name: filename, file_type: 'Expression Matrix', study: @basic_study)
    assert matrix.persisted?
    assert matrix.valid?
    # queue for deletion and attempt to use same filename again
    DeleteQueueJob.new(matrix).perform
    matrix.reload
    assert matrix.queued_for_deletion
    assert_not_equal filename, matrix.upload_file_name
    new_matrix = FactoryBot.create(:study_file, name: filename, file_type: 'Expression Matrix', study: @basic_study)
    assert new_matrix.persisted?
    assert new_matrix.valid?
  end
end
