require "integration_test_helper"

class SyntheticStudyPopulatorTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  test 'should be able to populate a study with convention metadata' do
    SYNTH_STUDY_INFO = {
      name: 'Male Mouse brain',
      folder: 'mouse_brain'
    }

    # SyntheticStudyPopulator does have logic for deleting existing sutdies on populate
    # but this is for belt-and-suspenders to make sure the delete is successful
    if Study.find_by(name: SYNTH_STUDY_INFO[:name])
      Study.find_by(name: SYNTH_STUDY_INFO[:name]).destroy_and_remove_workspace
    end

    assert_nil Study.find_by(name: SYNTH_STUDY_INFO[:name])

    SyntheticStudyPopulator.populate(SYNTH_STUDY_INFO[:folder])
    populated_study = Study.find_by(name: SYNTH_STUDY_INFO[:name])

    assert_not_nil populated_study
    assert_equal 1, populated_study.study_files.count
    assert_equal 'Metadata', populated_study.study_files.first.file_type
    assert_not_nil populated_study.study_detail.full_description

    # check supplementary study file information
    raw_counts_files = StudyFile.where(study: populated_study, 'expression_file_info.is_raw_counts': true)
    assert_equal 1, raw_counts_files.count
    raw_counts_file = raw_counts_files.first
    assert_equal raw_counts_file.genome_assembly.name = 'GRCm38'
    assert_equal raw_counts_file.genome_annotation.name = 'Ensembl 94'

    # note that we're not testing the ingest process yet due to timing concerns
    Study.find_by(name: SYNTH_STUDY_INFO[:name]).destroy_and_remove_workspace
  end
end
