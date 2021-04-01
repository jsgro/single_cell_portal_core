# generic_profiler.rb
#
# helper class to profile performance of loading clusters/expression data
# will write out results to HTML files that can be loaded for detailed results
# can also be used to profile any other method, both SCP-derived or native Ruby
class GenericProfiler

  EXPRESSION_PLOT_TYPES = %w(violin heatmap).freeze
  CONSENSUS_TYPES = [nil, 'mean', 'median'].freeze
  FLAMEGRAPH_PATH = Rails.root.join('lib', 'assets', 'perl', 'flamegraph.pl').freeze

  # generic profiling method - handles actual RubyProf.profile call and writing of reports
  # can be used to profile any method, whether both SCP-derived or native Ruby; works with both class methods & instance methods
  #
  # * *params*
  #   - +prof_object+ (Object) => object to run method from, can be a class or an instance of a class
  #   - +prof_method+ (Symbol) => method to call on +prof_object+
  #   - +arguments+ (Array) => positional/keyword arguments to pass to +prof_method+, which should be passed as array but formatted for +prof_method+, e.g.:
  #                            arguments = [arg_1, arg_2, arg_3: 'foo', arg_4: 'bar']
  #   - +random_seed+ (String) => random seed for profiling results (used for output directory)
  #   - +base_filename+ (String, Pathname) => base output filename for reports
  #   - +print_args+ (Boolean) => T/F to print argument list to STDOUT (default: false)
  #
  # * *yields*
  #   - Profiling results from :write_profiler_results
  #
  # * *returns*
  #   - (RubyProf::Profile) => profile of specified object/method/arguments
  #
  # * *raises*
  #   - (ArgumentError) => if :arguments is not a Hash or Array
  def self.profile(prof_object, prof_method, arguments, random_seed: SecureRandom.hex(6), base_filename: nil, print_args: false)
    raise ArgumentError.new("invalid arguments, must be passed as array: #{arguments.class.name}") if !arguments.is_a?(Array)
    filename = base_filename.nil? ? "#{prof_method}_run_#{random_seed}" : base_filename
    puts "Profiling #{prof_object}##{prof_method} with #{arguments.size} argument(s)"
    puts "ARGUMENTS\n#{arguments}" if print_args
    profile = RubyProf.profile { prof_object.send(prof_method, *arguments) }
    write_profiler_results(profile, filename, random_seed)
    profile
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
    true
  end

  ##
  # Specialized profilers
  # pre-configured profiling methods for loading clustering & gene expression data
  ##

  # profile performance of loading clustering data from ClustersController.get_cluster_viz_data
  # will show wall time performance of all sub-method calls with complete rollups
  #
  # * *params*
  #   - +study_accession+ (String) => accession of study to use, preferably w/ >= 1M cells
  #   - +random_seed+ (String) => random seed for profiling results (used for output directory)
  #   - +print_args+ (Boolean) => T/F to print argument list to STDOUT when calling :profile (default: false)
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation are not present
  def self.profile_clustering(study_accession, random_seed: SecureRandom.hex(6), print_args: false)
    validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    cluster = study.default_cluster
    annotation = study.default_annotation
    subsamples = cluster.subsample_thresholds_required.reverse + [:all]
    subsamples.each do |bm_threshold|
      subsample_threshold = bm_threshold == :all ? nil : bm_threshold
      annotation_name, annotation_type, annotation_scope = annotation.split('--')
      url_params = {
        annotation_name: annotation_name, annotation_type: annotation_type, annotation_scope: annotation_scope,
        subsample: subsample_threshold
      }
      base_filename = "get_cluster_viz_data_#{bm_threshold}"
      profile(
        Api::V1::Visualization::ClustersController, :get_cluster_viz_data, [study, cluster, url_params],
        random_seed: random_seed, base_filename: base_filename, print_args: print_args
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
  #   - +genes+ (String) => name of gene(s) to load as comma- or space-delimited string, can be omitted to chose random genes from study
  #   - +plot_type+ (String) => plot type, either violin or heatmap, defaults to violin
  #   - +consensus+ (String) => 'collapse by' measurement: mean or median, or nil to omit consensus collapse
  #   - +random_seed+ (String) => random seed for profiling results (used for output directory)
  #   - +print_args+ (Boolean) => T/F to print argument list to STDOUT when calling :profile (default: false)
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation/genes are not present
  def self.profile_expression(study_accession, genes: nil, plot_type: 'violin', consensus: nil, random_seed: SecureRandom.hex(6), print_args: false)
    validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    validate_expression_args(study, genes, plot_type, consensus)
    requested_genes = genes.blank? ? study.genes.sample.name : genes
    cluster = study.default_cluster
    annotation_name, annotation_type, annotation_scope = study.default_annotation.split('--')
    annotation = AnnotationVizService.get_selected_annotation(study,
                                                              cluster: cluster,
                                                              annot_name: annotation_name,
                                                              annot_type: annotation_type,
                                                              annot_scope: annotation_scope)
    subsamples = cluster.subsample_thresholds_required.reverse + [:all]
    gene_identifier = extract_gene_names(requested_genes).join('_')
    subsamples.each do |bm_threshold|
      subsample_threshold = bm_threshold == :all ? nil : bm_threshold
      base_filename = "get_genes_from_param_#{gene_identifier}_#{bm_threshold}"
      # profile loading genes, then actually load them to pass downstream
      profile(
        RequestUtils, :get_genes_from_param, [study, requested_genes],
        random_seed: random_seed, base_filename: base_filename, print_args: print_args
      )
      study_genes = RequestUtils.get_genes_from_param(study, requested_genes)
      case plot_type
      when 'violin'
        base_filename = "get_global_expression_render_data_#{gene_identifier}_#{bm_threshold}"
        profile(
          ExpressionVizService, :get_global_expression_render_data,
          [study: study, cluster: cluster, genes: study_genes, subsample: subsample_threshold,
           selected_annotation: annotation, consensus: consensus, boxpoints: 'all', current_user: study.user],
           random_seed: random_seed, base_filename: base_filename, print_args: print_args
        )
      when 'heatmap'
        base_filename = "get_morpheus_text_data_#{gene_identifier}_#{bm_threshold}"
        profile(
          ExpressionVizService, :get_morpheus_text_data,
          [
            study: study, cluster: cluster, genes: study_genes, file_type: :gct, selected_annotation: annotation, collapse_by: nil
          ], random_seed: random_seed, base_filename: base_filename, print_args: print_args
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
    if genes.present?
      names = extract_gene_names(genes)
      raise ArgumentError.new("#{genes} not present in #{study.accession}") if study.genes.where(:name.in => names).empty?
    end
    true
  end

  def self.extract_gene_names(gene_string)
    gene_string.split(/\s|,/)
  end
end
