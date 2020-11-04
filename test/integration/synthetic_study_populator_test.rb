require "integration_test_helper"

class SyntheticStudyPopulatorTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @taxon = Taxon.find_or_create_by!(common_name: 'mouse',
                           scientific_name: 'Mus musculus',
                           user: User.first,
                           ncbi_taxid: 10090,
                           notes: 'fake mouse taxon for testing')
    @genome_assembly = GenomeAssembly.find_or_create_by!(name: "GRCm38",
                                              alias: nil,
                                              release_date: '2012-01-09',
                                              accession: "GCA_000001635.2",
                                              taxon: @taxon)
    @genome_annotation = GenomeAnnotation.find_or_create_by!(name: 'Ensembl 94',
                                                  link: 'http://google.com/search?q=mouse',
                                                  index_link: 'http://google.com/search?q=mouse_index',
                                                  release_date: '2020-10-19',
                                                  genome_assembly: @genome_assembly)
  end

  teardown do
    # this will also destroy the dependent annotation and assembly
    @taxon.destroy!
  end

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
    assert_equal 4, populated_study.study_files.count
    assert_equal 'Metadata', populated_study.study_files.first.file_type
    assert_not_nil populated_study.study_detail.full_description

    # check supplementary study file information
    raw_counts_files = StudyFile.where(study: populated_study, 'expression_file_info.is_raw_counts': true)
    assert_equal 1, raw_counts_files.count
    raw_counts_file = raw_counts_files.first
    assert_equal 'GRCm38', raw_counts_file.genome_assembly.name
    assert_equal 'Ensembl 94', raw_counts_file.genome_annotation.name

    # note that we're not testing the ingest process yet due to timing concerns
    Study.find_by(name: SYNTH_STUDY_INFO[:name]).destroy_and_remove_workspace
  end
end
