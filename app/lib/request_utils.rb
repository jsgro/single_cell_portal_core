# RequestUtils: helper class for dealing with request parameters, sanitizing input, and setting
# cache paths on visualization requests
class RequestUtils

  # list of parameters to reject from :get_cache_key as they will be represented by request.path
  # format is always :json and therefore unnecessary
  CACHE_PATH_BLACKLIST = %w(controller action format study_id)

  # character regex to convert into underscores (_) for cache path setting
  PATH_REGEX =/(\/|%2C|%2F|%20|\?|&|=|\.|,|\s)/

  # load same sanitizer as ActionView for stripping html/js from inputs
  # using FullSanitizer as it is the most strict
  SANITIZER ||= Rails::Html::FullSanitizer.new

  ##
  # Cache path methods
  ##

  def self.get_cache_path(request_path, url_params)
    # transform / into _ to avoid encoding as %2f
    sanitized_path = sanitize_value_for_cache(request_path)
    # remove unwanted parameters from cache_key, as well as empty values
    # this simplifies base key into smaller value, e.g. _single_cell_api_v1_studies_SCP123_explore_
    # parameters must also be sorted by name to ensure cache paths are idempotent
    params_key = url_params.reject {|name, value| CACHE_PATH_BLACKLIST.include?(name) || value.empty?}.sort_by {|k,v| k}.
      map do |parameter_name, parameter_value|
      if parameter_name == 'genes'
        "#{parameter_name}_#{construct_gene_list_hash(parameter_value)}"
      else
        "#{parameter_name}_#{sanitize_value_for_cache(parameter_value).split.join('_')}"
      end
    end
    [sanitized_path, params_key].join('_')
  end

  # create a unique hex digest of a list of genes for use in get_cache_key
  # this prevents long gene list queries from being split in the middle due to maximum filename length limits
  # and resulting in invalid % encoding issue when trying to clear selected cache entries
  def self.construct_gene_list_hash(query_list)
    genes = query_list.split(',').map {|gene| gene.strip.gsub(/(%|\/)/, '')}.sort.join
    Digest::SHA256.hexdigest genes
  end

  ##
  # Sanitizer methods
  ##

  # remove url-encoded characters from request paths & parameter values
  # extra gsub at the end will catch any mangled encodings and trim them
  def self.sanitize_value_for_cache(value)
    value.gsub(PATH_REGEX, '_').gsub(/(%|\/)/, '')
  end

  # sanitizes a page param into an integer.  Will default to 1 if the value
  # is nil or otherwise can't be read
  def self.sanitize_page_param(page_param)
    page_num = 1
    parsed_num = page_param.to_i
    if (parsed_num > 0)
      page_num = parsed_num
    end
    page_num
  end

  # safely determine min/max bounds of an array, accounting for NaN value
  def self.get_minmax(values_array)
    begin
      values_array.minmax
    rescue TypeError, ArgumentError
      values_array.dup.reject! {|value| value.nil? || value.nan? }.minmax
    end
  end

  # safely strip unsafe characters and encode search parameters for query/rendering
  # strips out unsafe characters that break rendering notices/modals
  def self.sanitize_search_terms(terms)
    inputs = terms.is_a?(Array) ? terms.join(',') : terms.to_s
    SANITIZER.sanitize(inputs).encode!(Encoding.find('ASCII-8BIT'), invalid: :replace, undef: :replace)
  end

  # helper method for getting the base url with protocol, hostname, and port
  # e.g. "https://localhost"
  def self.get_base_url
    url_opts = ApplicationController.default_url_options
    base_url = "#{url_opts[:protocol]}://#{url_opts[:host]}"
    if url_opts[:port].present?
      base_url += ":#{url_opts[:port]}"
    end
    base_url
  end

  # extracts an array of genes from a comma-delimited string list of gene names
  def self.get_genes_from_param(study, gene_param)
    terms = RequestUtils.sanitize_search_terms(gene_param).split(',')
    matrix_ids = study.expression_matrix_files.map(&:id)
    genes = []
    terms.each do |term|
      matches = study.genes.by_name_or_id(term, matrix_ids)
      unless matches.empty?
        genes << matches
      end
    end
    genes
  end
end
