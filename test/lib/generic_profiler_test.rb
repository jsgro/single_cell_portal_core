require 'test_helper'

class GenericProfilerTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Profiler Test',
                                     user: @user,
                                     test_array: @@studies_to_clean)
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
  end

  test 'should profile method' do
    profile_results = GenericProfiler.profile(AnnotationVizService, :get_selected_annotation, SecureRandom.hex(4), @basic_study)
    assert profile_results.any?
    profile_results.each do |profile_path|
      assert File.exist? profile_path
    end
  end

  test 'should profile clustering methods' do
    profile_results = GenericProfiler.profile_clustering(@basic_study.accession)
    assert profile_results.any?
    profile_results.each do |profile_path|
      assert File.exist? profile_path
    end
  end

  test 'should profile gene expression methods' do
    # test violin
    gene_name = 'PTEN'
    violin_results = GenericProfiler.profile_expression(@basic_study.accession, genes: gene_name)
    assert violin_results.any?
    violin_results.each do |profile_path|
      assert File.exist? profile_path
    end

    # test heatmap
    gene_names = 'PTEN,AGPAT2'
    heatmap_results = GenericProfiler.profile_expression(@basic_study.accession, genes: gene_names, plot_type: 'heatmap')
    assert heatmap_results.any?
    heatmap_results.each do |profile_path|
      assert File.exist? profile_path
    end
  end

  test 'should write arguments file' do
    args = [@basic_study, 'some value', foo: 'bar', bing: 'baz']
    random_seed = SecureRandom.hex(4)
    test_dir = random_seed + '_test'
    GenericProfiler.write_args_list(test_dir, random_seed, *args)
    filename = "#{random_seed}_arguments.txt"
    args_filepath = Rails.root.join(GenericProfiler::PROFILE_BASEDIR, test_dir, filename)
    assert File.exist?(args_filepath)
    args_file = File.open(args_filepath).read
    assert args_file.include?(@basic_study.name)
    assert args_file.include?('"some value"')
    assert args_file.include?('foo: "bar"')
    assert args_file.include?('bing: "baz"')
  end

  test 'should capture error when writing report' do
    non_existent_file = Rails.root.join('does', 'not', 'exist.txt')
    profile = RubyProf.profile { puts "test" }
    printer = RubyProf::FlatPrinter.new(profile)

    # write_report should capture the error when trying to write to the non-existent filepath and still return
    report = GenericProfiler.write_report(non_existent_file, printer)
    refute report.exist?
  end
end
