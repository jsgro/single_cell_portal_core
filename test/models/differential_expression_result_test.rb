require 'test_helper'

class DifferentialExpressionResultTest  < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                                     name_prefix: 'DifferentialExpressionResult Test',
                                     user: @user,
                                     test_array: @@studies_to_clean)

    @cells = %w[A B C D E F G]
    @coordinates = 1.upto(7).to_a
    @species = %w[dog cat dog dog cat cat cat]
    @diseases = %w[measles measles measles none none measles measles]
    @library_preparation_protocol = Array.new(7, "10X 5' v3")
    @raw_matrix = FactoryBot.create(:expression_file,
                                    name: 'raw.txt',
                                    study: @study,
                                    expression_file_info: {
                                      is_raw_counts: true,
                                      units: 'raw counts',
                                      library_preparation_protocol: 'Drop-seq',
                                      biosample_input_type: 'Whole cell',
                                      modality: 'Proteomic'
                                    })
    @cluster_file = FactoryBot.create(:cluster_file,
                                      name: 'cluster_diffexp.txt',
                                      study: @study,
                                      cell_input: {
                                        x: @coordinates,
                                        y: @coordinates,
                                        cells: @cells,
                                      },
                                      annotation_input: [
                                        { name: 'disease', type: 'group', values: @diseases }
                                      ])
    @cluster_group = ClusterGroup.find_by(study: @study, study_file: @cluster_file)

    FactoryBot.create(:metadata_file,
                      name: 'metadata.txt',
                      study: @study,
                      cell_input: @cells,
                      annotation_input: [
                        { name: 'species', type: 'group', values: @species },
                        { name: 'library_preparation_protocol', type: 'group', values: @library_preparation_protocol }
                      ])

    @species_result = DifferentialExpressionResult.create(
      study: @study, cluster_group: @cluster_file.cluster_groups.first, annotation_name: 'species',
      annotation_scope: 'study'
    )

    @disease_result = DifferentialExpressionResult.create(
      study: @study, cluster_group: @cluster_file.cluster_groups.first, annotation_name: 'disease',
      annotation_scope: 'cluster'
    )
  end

  test 'should validate DE results and set observed values' do
    assert @species_result.valid?
    assert_equal %w[cat dog], @species_result.observed_values.sort
    assert_equal @cluster_group.name, @species_result.cluster_name

    assert @disease_result.valid?
    assert_equal %w[measles none], @disease_result.observed_values.sort
    assert_equal @cluster_group.name, @disease_result.cluster_name

    library_result = DifferentialExpressionResult.new(
      study: @study, cluster_group: @cluster_group, annotation_name: 'library_preparation_protocol',
      annotation_scope: 'study'
    )

    assert_not library_result.valid?
  end

  test 'should retrieve source annotation object' do
    assert @species_result.annotation_object.present?
    assert @species_result.annotation_object.is_a?(CellMetadatum)
    assert_equal @species_result.observed_values.sort,
                 @species_result.annotation_object.values.sort

    assert @disease_result.annotation_object.present?
    assert @disease_result.annotation_object.is_a?(Hash) # cell_annotation from ClusterGroup
    assert_equal @disease_result.observed_values.sort, @disease_result.annotation_object[:values].sort
  end

  test 'should return relative bucket pathname for individual label' do
    prefix = "_scp_internal/differential_expression"
    @species_result.observed_values.each do |label|
      expected_filename = "#{prefix}/cluster_diffexp_txt--species--#{label}--study--wilcoxon.tsv"
      assert_equal expected_filename, @species_result.bucket_path_for(label)
    end

    @disease_result.observed_values.each do |label|
      expected_filename = "#{prefix}/cluster_diffexp_txt--disease--#{label}--cluster--wilcoxon.tsv"
      assert_equal expected_filename, @disease_result.bucket_path_for(label)
    end
  end

  test 'should return array of select options for observed outputs' do
    species_opts = {
      dog: 'cluster_diffexp_txt--species--dog--study--wilcoxon.tsv',
      cat: 'cluster_diffexp_txt--species--cat--study--wilcoxon.tsv'
    }.with_indifferent_access

    disease_opts = {
      measles: 'cluster_diffexp_txt--disease--measles--cluster--wilcoxon.tsv',
      none: 'cluster_diffexp_txt--disease--none--cluster--wilcoxon.tsv'
    }.with_indifferent_access

    assert_equal species_opts.to_a, @species_result.select_options
    assert_equal disease_opts.to_a, @disease_result.select_options
  end
end
