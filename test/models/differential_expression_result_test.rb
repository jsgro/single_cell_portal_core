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
                                        cells: @cells
                                      })
    FactoryBot.create(:metadata_file,
                      name: 'metadata.txt',
                      study: @study,
                      cell_input: @cells,
                      annotation_input: [
                        { name: 'species', type: 'group', values: @species },
                        { name: 'disease', type: 'group', values: @diseases },
                        { name: 'library_preparation_protocol', type: 'group', values: @library_preparation_protocol }
                      ])

    @differential_expression_result = DifferentialExpressionResult.create(
      study: @study, cluster_group: @cluster_file.cluster_groups.first, annotation_name: 'species',
      annotation_scope: 'study'
    )
  end

  test 'should validate DE results' do
    assert @differential_expression_result.valid?
    assert_equal %w[cat dog], @differential_expression_result.observed_values.sort

    disease_result = DifferentialExpressionResult.new(
      study: @study, cluster_group: @cluster_file.cluster_groups.first, annotation_name: 'disease',
      annotation_scope: 'study'
    )

    assert disease_result.valid?
    assert_equal %w[measles none], disease_result.observed_values.sort

    library_result = DifferentialExpressionResult.new(
      study: @study, cluster_group: @cluster_file.cluster_groups.first, annotation_name: 'library_preparation_protocol',
      annotation_scope: 'study'
    )

    assert_not library_result.valid?
  end
end
