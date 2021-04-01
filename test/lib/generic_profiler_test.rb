require 'test_helper'

class GenericProfilerTest < ActiveSupport::TestCase

  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study, name_prefix: 'Profiler Test', test_array: @@studies_to_clean)
    @basic_study_cluster_file = FactoryBot.create(:cluster_file,
                                                  name: 'cluster_1.txt', study: @basic_study,
                                                  cell_input: {
                                                    x: [1, 4 ,6],
                                                    y: [7, 5, 3],
                                                    z: [2, 8, 9],
                                                    cells: ['A', 'B', 'C']
                                                  },
                                                  x_axis_label: 'PCA 1',
                                                  y_axis_label: 'PCA 2',
                                                  z_axis_label: 'PCA 3',
                                                  cluster_type: '3d',
                                                  annotation_input: [
                                                    {name: 'Category', type: 'group', values: ['bar', 'bar', 'baz']},
                                                    {name: 'Intensity', type: 'numeric', values: [1.1, 2.2, 3.3]}
                                                  ])

    @basic_study_exp_file = FactoryBot.create(:study_file,
                                              name: 'dense.txt',
                                              file_type: 'Expression Matrix',
                                              study: @basic_study)

    @study_metadata_file = FactoryBot.create(:metadata_file,
                                             name: 'metadata.txt', study: @basic_study,
                                             cell_input: ['A', 'B', 'C'],
                                             annotation_input: [
                                               {name: 'species', type: 'group', values: ['dog', 'cat', 'dog']},
                                               {name: 'disease', type: 'group', values: ['none', 'none', 'measles']}
                                             ])

    @pten_gene = FactoryBot.create(:gene_with_expression,
                                   name: 'PTEN',
                                   study_file: @basic_study_exp_file,
                                   expression_input: [['A', 0],['B', 3],['C', 1.5]])
    @agpat2_gene = FactoryBot.create(:gene_with_expression,
                                     name: 'AGPAT2',
                                     study_file: @basic_study_exp_file,
                                     expression_input: [['A', 0],['B', 0],['C', 8]])
    defaults = {
      cluster: 'cluster_1.txt',
      annotation: 'species--group--study'
    }
    @basic_study.update(default_options: defaults)
    @test_seed = SecureRandom.hex(6)
  end

  # helper to ensure all expected reports were written
  def validate_all_reports(base_filename)
    html_report_path = Rails.root.join('tmp', 'profiling', @test_seed, base_filename + '.html')
    calls_output_path = Rails.root.join('tmp', 'profiling', @test_seed, base_filename + '.calls.txt')
    flamegraph_svg_path = Rails.root.join('tmp', 'profiling', @test_seed, base_filename + '.svg')
    [html_report_path, calls_output_path, flamegraph_svg_path].each do |report_path|
      assert File.exists?(report_path)
    end
  end

  test 'should profile method' do
    base_filename = "get_selected_annotation_test"
    profile_results = GenericProfiler.profile(AnnotationVizService, :get_selected_annotation, [@basic_study],
                                              random_seed: @test_seed, base_filename: base_filename)
    assert profile_results.present?
    assert profile_results.is_a?(RubyProf::Profile)
    validate_all_reports(base_filename)
  end

  test 'should profile clustering methods' do
    base_filename = "get_cluster_viz_data_all"
    GenericProfiler.profile_clustering(@basic_study.accession, random_seed: @test_seed)
    validate_all_reports(base_filename)
  end

  test 'should profile gene expression methods' do
    # test violin
    gene_name = 'PTEN'
    GenericProfiler.profile_expression(@basic_study.accession, genes: gene_name, random_seed: @test_seed)
    %w(get_genes_from_param_PTEN_all get_global_expression_render_data_PTEN_all).each do |base_filename|
      validate_all_reports(base_filename)
    end

    # test heatmap
    gene_names = 'PTEN,AGPAT2'
    GenericProfiler.profile_expression(@basic_study.accession, genes: gene_names, plot_type: 'heatmap', random_seed: @test_seed)
    %w(get_genes_from_param_PTEN_AGPAT2_all get_morpheus_text_data_PTEN_AGPAT2_all).each do |base_filename|
      validate_all_reports(base_filename)
    end
  end
end
