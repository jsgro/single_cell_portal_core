require "test_helper"

class ExpressionVizServiceTest < ActiveSupport::TestCase

  setup do
    @user = FactoryBot.create(:user)
    @basic_study = FactoryBot.create(:detached_study, name: 'Basic Viz')
    @basic_study_cluster_file = FactoryBot.create(:study_file,
                                                  name: 'cluster1.txt',
                                                  file_type: 'Cluster',
                                                  study: @basic_study)
    @basic_study_exp_file = FactoryBot.create(:study_file,
                                                  name: 'dense.txt',
                                                  file_type: 'Expression Matrix',
                                                  study: @basic_study)
    @cluster_group = FactoryBot.create(:cluster_group_with_cells,
                                       study_file: @basic_study_cluster_file,
                                       cell_data: {
                                         x: [1, 4 ,6],
                                         y: [7, 5, 3],
                                         cells: ['A', 'B', 'C']
                                       },
                                       annotations: [{name: 'foo', type: 'group', values: ['bar', 'bar', 'baz']}])
    @pten_gene = FactoryBot.create(:gene_with_expression,
                                   name: 'PTEN',
                                   study_file: @basic_study_exp_file,
                                   expression_data: [['A', 0],['B', 3],['C', 1.5]])
    @agpat2_gene = FactoryBot.create(:gene_with_expression,
                                     name: 'AGPAT2',
                                     study_file: @basic_study_exp_file,
                                     expression_data: [['A', 0],['B', 0],['C', 8]])
  end

  teardown do
    @basic_study.destroy
    @user.destroy
  end

  test 'can find annotation for cluster' do
    annotation = ExpressionVizService.get_selected_annotation(@basic_study, @cluster_group, 'foo', 'group', 'cluster')
    assert_equal 'foo', annotation[:name]
    assert_equal ['bar', 'baz'], annotation[:values]
  end
end
