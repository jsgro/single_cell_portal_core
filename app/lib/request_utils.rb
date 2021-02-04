require 'rails/commands/server/server_command'

class RequestUtils

  # load same sanitizer as ActionView for stripping html/js from inputs
  # using FullSanitizer as it is the most strict
  SANITIZER ||= Rails::Html::FullSanitizer.new

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
    SANITIZER.sanitize(inputs).encode('ASCII-8BIT', invalid: :replace, undef: :replace)
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
