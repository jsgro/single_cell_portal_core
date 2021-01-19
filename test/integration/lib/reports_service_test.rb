require 'test_helper'

class ReportsServiceTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor
  include SelfCleaningSuite

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @user2 = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'report service test',
                                     test_array: @@studies_to_clean,
                                     user: @user)
    @study_metadata_file = FactoryBot.create(:metadata_file,
                                             use_metadata_convention: true,
                                             name: 'metadata.txt',
                                             study: @basic_study)

    @study_expression_file = FactoryBot.create(:expression_file,
                                               expression_file_info: {
                                                 is_raw_counts: true,
                                                 units: 'raw counts',
                                                 library_preparation_protocol: 'Drop-seq',
                                                 biosample_input_type: 'Whole cell',
                                                 modality: 'Proteomic'
                                               },
                                               name: 'expression.txt',
                                               study: @basic_study)
  end

  test 'study_data return array of hashes with correct study information' do
    report_data = ReportsService.study_data
    assert_equal Study.where(queued_for_deletion: false).count, report_data.count
    basic_study_row = report_data.select {|r| r[:id] == @basic_study.id}.first
    assert_equal @basic_study.accession, basic_study_row[:accession]
    assert_equal @user.email, basic_study_row[:owner_email]
    assert_equal 'test.edu', basic_study_row[:owner_domain]
    assert_equal true, basic_study_row[:metadata_convention]
    assert_equal true, basic_study_row[:has_raw_counts]
  end

  test 'get_report returns tsv' do
    report_string = ReportsService.get_report_data('studies')
    assert report_string.starts_with?(ReportsService::REPORTS[:studies][:data_columns].join("\t"))
    assert report_string.include?(@user.email)
  end
end
