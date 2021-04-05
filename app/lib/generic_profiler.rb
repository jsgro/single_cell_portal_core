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
  #   - +arguments+ (Array) => positional/keyword arguments to pass to +prof_method+
  #
  # * *returns*
  #   - (Array<Pathname>) => Array of filepaths to all yielded reports from :write_profiler_reports
  #
  # * *raises*
  #   - (ArgumentError) => if :arguments is not a Hash or Array
  def self.profile(prof_object, prof_method, *arguments)
    base_filename = set_base_filename(prof_object, prof_method, arguments)
    random_seed = SecureRandom.hex(8)
    puts "Profiling #{prof_object}##{prof_method} with #{arguments.size} argument(s)"
    profile = RubyProf.profile { prof_object.send(prof_method, arguments) }
    write_profiler_reports(profile, base_filename, random_seed)
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
  #
  # * *returns*
  #   - (Array<Pathname>) => Array of filepaths to all yielded reports
  def self.write_profiler_reports(profile, base_filename, random_seed)
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
    [html_filepath, flamegraph_filepath, flamegraph_svg_path]
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
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *returns*
  #   - (Array<Pathname>) => Array of filepaths to all yielded reports
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation are not present
  def self.profile_clustering(study_accession)
    validate_cluster_args(study_accession)
    reports = []
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
      reports += profile(
        Api::V1::Visualization::ClustersController, :get_cluster_viz_data, study, cluster, url_params
      )
    end
    reports
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
  #
  # * *yields*
  #   - (RubyProf::GraphHtmlPrinter) => While profiling, individual reports will print to files and display paths in console
  #
  # * *returns*
  #   - (Array<Pathname>) => Array of filepaths to all yielded reports
  #
  # * *raises*
  #   - (ArgumentError) => if study/cluster/annotation/genes are not present
  def self.profile_expression(study_accession, genes: nil, plot_type: 'violin', consensus: nil)
    validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    validate_expression_args(study, genes, plot_type, consensus)
    reports = []
    requested_genes = genes.blank? ? study.genes.sample.name : genes
    cluster = study.default_cluster
    annotation_name, annotation_type, annotation_scope = study.default_annotation.split('--')
    annotation = AnnotationVizService.get_selected_annotation(study,
                                                              cluster: cluster,
                                                              annot_name: annotation_name,
                                                              annot_type: annotation_type,
                                                              annot_scope: annotation_scope)
    subsamples = cluster.subsample_thresholds_required.reverse + [:all]
    subsamples.each do |bm_threshold|
      subsample_threshold = bm_threshold == :all ? nil : bm_threshold
      # profile loading genes, then actually load them to pass downstream
      reports += profile(
        RequestUtils, :get_genes_from_param, study, requested_genes
      )
      study_genes = RequestUtils.get_genes_from_param(study, requested_genes)
      case plot_type
      when 'violin'
        reports += profile(
          ExpressionVizService, :get_global_expression_render_data,
          study: study, cluster: cluster, genes: study_genes, subsample: subsample_threshold,
           selected_annotation: annotation, consensus: consensus, boxpoints: 'all', current_user: study.user
        )
      when 'heatmap'
        reports += profile(
          ExpressionVizService, :get_morpheus_text_data, study: study, cluster: cluster,
          genes: study_genes, file_type: :gct, selected_annotation: annotation, collapse_by: nil
        )
      end
    end
    reports
  end

  private

  # validate arguments for :profile_clustering and :profile_expression
  def self.validate_cluster_args(study_accession)
    study = Study.find_by(accession: study_accession)
    raise ArgumentError.new("#{study_accession} is not valid") if study.nil?
    cluster = study.default_cluster
    annotation = study.default_annotation
    raise ArgumentError.new("#{study_accession} cannot visualize clusters") if (cluster.nil? || annotation.nil?)
    true
  end

  # validate arguments for :profile_expression
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

  # set the base filename for reports
  # includes object & method name, as well as formatted args list
  def self.set_base_filename(object, method_name, *args)
    object_name = get_object_name(object)
    arg_list = format_arg_list(args)
    "#{object_name}##{method_name}_ARGS_#{arg_list}"
  end

  # get a formatted "name" for set_base_filename
  # will try to use :accession or :name first, and after that will try a series of fallbacks to format object
  # will recursively iterate through hashes/arrays as needed
  def self.get_object_name(object)
    if object.respond_to?(:accession)
      object.accession
    elsif object.respond_to?(:name)
      object.name.gsub(/\s/, '-')
    elsif object.is_a?(Hash)
      arg_list = ""
      object.each_pair do |key, value|
        arg_list += "#{key}_#{get_object_name(value)}_"
      end
      arg_list
    elsif object.respond_to?(:each)
      arg_list = ""
      object.each do |value|
        arg_list += "#{get_object_name(value)}_"
      end
      arg_list
    elsif object.is_a?(Class)
      object.to_s
    elsif object.is_a?(String)
      object.gsub(/\s/, '-')
    else
      object.class.name
    end
  end

  # get a string to use as part of filename w/ all param values
  def self.format_arg_list(args)
    args.map {|arg| get_object_name(arg)}.join('_').chomp('_')
  end

  # split gene names on space/comma
  def self.extract_gene_names(gene_string)
    gene_string.split(/\s|,/)
  end
end
