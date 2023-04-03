require 'test_helper'

class DifferentialExpressionFileInfoTest < ActiveSupport::TestCase

  before(:all) do
    cells = %w[A B C D E F G]
    coords = [1, 2, 3, 4, 5, 6, 7]
    cell_types = ['B cell', 'T cell', 'B cell', 'T cell', 'T cell', 'B cell', 'B cell']
    custom_cell_types = [
      'Naive B cell', 'Naive Treg', 'Naive B cell', 'Naive Treg', 'Naive Treg', 'Naive B cell', 'Naive B cell'
    ]
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study, name_prefix: 'DE Test', user: @user, test_array: @@studies_to_clean)
    FactoryBot.create(:metadata_file, name: 'metadata.txt', study: @study, cell_input: cells, annotation_input: [
      { name: 'cell_type__ontology_label', type: 'group', values: cell_types },
      { name: 'cell_type__custom', type: 'group', values: custom_cell_types }
    ])
    FactoryBot.create(:cluster_file, name: 'cluster.txt', study: @study, cell_input: { x: coords, y: coords, cells: })
  end

  test 'should validate user-uploaded differential expression file' do
    de_file = FactoryBot.create(:study_file,
                                study: @study,
                                file_type: 'Differential Expression',
                                name: 'de.txt')
    de_info = de_file.build_differential_expression_file_info
    de_info.annotations = [
      { annotation_name: 'cell_type__ontology_label', annotation_scope: 'study' },
      { annotation_name: 'cell_type__custom', annotation_scope: 'study' }
    ]
    cluster = @study.cluster_groups.by_name('cluster.txt')
    de_info.cluster_group = cluster
    de_file.save
    assert de_file.valid?
    assert de_file.differential_expression_file_info.valid?
    de_info.annotations.each do |annotation|
      assert de_info.annotation_object(annotation).present?,
             "Did not find annotation for #{annotation}"
    end
  end
end
