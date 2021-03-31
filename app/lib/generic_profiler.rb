# generic_profiler.rb
#
# helper class to profile performance of loading clusters/expression data
# will write out results to HTML files that can be loaded for detailed results
# can also be used to profile any other method, both SCP-derived or native Ruby
class GenericProfiler

  EXPRESSION_PLOT_TYPES = %w(violin heatmap).freeze
  CONSENSUS_TYPES = %w(nil mean median).freeze
  FLAMEGRAPH_PATH = Rails.root.join('lib', 'assets', 'perl', 'flamegraph.pl')

  # generic profiling method - handles actual RubyProf.profile call and writing of reports
  # can be used to profile any method, whether both SCP-derived or native Ruby, provided they do not use a mix
  # of positional and keyword arguments
  # works with both class methods & instance methods
  #
  # * *params*
  #   - +prof_object+ (Object) => object to run method from, can be a class or an instance of a class
  #   - +prof_method+ (Symbol) => method to call on +prof_object+
  #   - +random_seed+ (String) => random seed for profiling results (used for output directory)
  #   - +base_filename+ (String, Pathname) => base output filename for reports
  #   - +arguments+ (Array, Hash) => arguments to pass to +prof_method+, will be passed with appropriate splat operator to type
  #
  # * *yields*
  #   - Profiling results from :write_profiler_results
  #
  # * *raises*
  #   - (ArgumentError) => if :arguments is not a Hash or Array
  def self.profile(prof_object, prof_method, random_seed, base_filename, arguments)
    puts "Profiling #{prof_object}#{prof_method} with arguments: #{arguments}"
    # use single splat (*) for positional arguments, and double splat (**) for keyword arguments
    if arguments.is_a?(Array)
      profile = RubyProf.profile do
        prof_object.send(prof_method, *arguments)
      end
    elsif arguments.is_a?(Hash)
      prof_object.send(prof_method, **arguments)
    else
      raise ArgumentError.new("invalid format for arguments: #{arguments.class.name}")
    end
    write_profiler_results(profile, base_filename, random_seed)
  end

  # write out profiler reports & images
  #
  # * *params*
  #   - +profile+ (RubyProf::Profile) => profiler results
  #   - +base_filename+ (String) => basename of report files (missing extension)
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => html profile report
  #   - (RubyProf::FlameGraphPrinter) => flamegraph profile report (call stack)
  #   - (SVG) => FlameGraph SVG
  def self.write_profiler_results(profile, base_filename, random_seed)
    puts "Profiling complete, writing reports"
    reports_basepath = Rails.root.join('tmp', 'profiling', random_seed)
    FileUtils.mkdir_p(reports_basepath) unless Dir.exists?(reports_basepath)
    html_filepath = Rails.root.join(reports_basepath, base_filename + '.html')
    flamegraph_filepath = Rails.root.join(reports_basepath, base_filename + '.calls.txt')
    File.open(html_filepath, 'w+') do |file|
      puts "writing HTML results to #{html_filepath}"
      printer = RubyProf::GraphHtmlPrinter.new(profile)
      printer.print(file)
    end
    File.open(flamegraph_filepath, 'w+') do |file|
      puts "writing FlameGraph results to #{flamegraph_filepath}"
      printer = RubyProf::FlameGraphPrinter.new(profile)
      printer.print(file)
    end
    flamegraph_svg_path = Rails.root.join(reports_basepath, base_filename + '.svg')
    puts "creating flamegraph SVG from #{flamegraph_filepath}"
    system("#{FLAMEGRAPH_PATH} #{flamegraph_filepath} --countname=ms > #{flamegraph_svg_path}")
  end

  # profile performance of loading clustering data from ClustersController.get_cluster_viz_data
  # will show wall time performance of all sub-method calls with complete rollups
  #
  # * *params*
  #   - +study_accession+ (String) => accession of study to use, preferably w/ >= 1M cells
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation are not present
  def self.profile_clustering(study_accession)
    validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    cluster = study.default_cluster
    annotation = study.default_annotation
    subsamples = cluster.subsample_thresholds_required.reverse + [:all]
    random_seed = SecureRandom.hex(6)
    subsamples.each do |bm_threshold|
      subsample_threshold = bm_threshold == :all ? nil : bm_threshold
      annotation_name, annotation_type, annotation_scope = annotation.split('--')
      url_params = {
        annotation_name: annotation_name, annotation_type: annotation_type, annotation_scope: annotation_scope,
        subsample: subsample_threshold
      }
      base_filename = "get_cluster_viz_data_#{bm_threshold}"
      profile(
        Api::V1::Visualization::ClustersController, :get_cluster_viz_data, random_seed, base_filename,
        [study, cluster, url_params]
      )
    end
    nil
  end

  # profile performance of loading expression data from ExpressionVizService.get_global_expression_render_data
  # and ExpressionVizService.get_morpheus_text_data, depending on requested type
  # will show wall time performance of all sub-method calls with complete rollups
  #
  # * *params*
  #   - +study_accession+ (String) => accession of study to use, preferably w/ >= 1M cells
  #   - +genes+ (String) => name of gene(s) to load as comma-delimited string, can be omitted to chose random genes from study
  #   - +plot_type+ (String) => plot type, either violin or heatmap, defaults to violin
  #   - +consensus+ (String) => 'collapse by' measurement: mean or median, or nil to omit consensus collapse
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation/genes are not present
  def self.profile_expression(study_accession, genes: nil, plot_type: 'violin', consensus: nil)
    validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    validate_expression_args(study, genes, plot_type, consensus)
    requested_genes = load_genes_from_study(study, genes)
    cluster = study.default_cluster
    annotation_name, annotation_type, annotation_scope = study.default_annotation.split('--')
    annotation = AnnotationVizService.get_selected_annotation(study,
                                                              cluster: cluster,
                                                              annot_name: annotation_name,
                                                              annot_type: annotation_type,
                                                              annot_scope: annotation_scope)
    subsamples = cluster.subsample_thresholds_required.reverse + [:all]
    gene_keys = requested_genes.keys.join('_')
    random_seed = SecureRandom.hex(6)
    subsamples.each do |bm_threshold|
      subsample_threshold = bm_threshold == :all ? nil : bm_threshold

      case plot_type
      when 'violin'
        base_filename = "get_global_expression_render_data_#{gene_keys}_#{bm_threshold}"
        profile(
          ExpressionVizService, :get_global_expression_render_data, random_seed, base_filename,
          {
            study: study, cluster: cluster, genes: requested_genes, subsample: subsample_threshold, annotation: annotation,
            consensus: consensus, boxpoints: 'all', current_user: study.user
          }
        )
      when 'heatmap'
        base_filename = "get_morpheus_text_data_#{gene_keys}_#{bm_threshold}"
        profile(
          ExpressionVizService, :get_morpheus_text_data, random_seed, base_filename,
          {
            study: study, cluster: cluster, genes: requested_genes, file_type: :gct, selected_annotation: annotation,
            collapse_by: nil
          }
        )
      end
    end
    nil
  end

  private

  def self.validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    raise ArgumentError.new("#{study_accession} is not valid") if study.nil?
    cluster = study.default_cluster
    annotation = study.default_annotation
    raise ArgumentError.new("#{study_accession} cannot visualize clusters") if (cluster.nil? || annotation.nil?)
    true
  end

  def self.validate_expression_args(study, genes, plot_type, consensus)
    raise ArgumentError.new("#{study.accession} has no gene expression data") if study.genes.empty?
    raise ArgumentError.new("#{plot_type} is not a valid plot type") if !EXPRESSION_PLOT_TYPES.include?(plot_type)
    raise ArgumentError.new("#{consensus} is not a valid consensus") if !CONSENSUS_TYPES.include?(consensus)
    raise ArgumentError.new("#{genes} not found in #{study.accession}") if load_genes_from_study(study, genes).empty?
    true
  end

  def self.load_genes_from_study(study, gene_names)
    names = gene_names.nil? ? study.genes.sample.name : gene_names
    RequestUtils.get_genes_from_param(study, names)
  end
end
