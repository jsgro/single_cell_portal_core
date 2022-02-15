# collection of methods for searching studies
class StudySearchService

  MAX_GENE_SEARCH = 50
  MAX_GENE_SEARCH_MSG = "For performance reasons, gene search is limited to #{MAX_GENE_SEARCH} genes. Please use " \
                        'multiple searches to view more genes.'.freeze

  # list of common 'stop words' to scrub from term-based search requests
  # these are unhelpful in search contexts as they artificially inflate irrelevant results
  # from https://gist.github.com/sebleier/554280
  STOP_WORDS = %w[i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she
                  her hers herself it its itself they them their theirs themselves what which who whom this that
                  these those am is are was were be been being have has had having do does did doing a an the and
                  but if or because as until while of at by for with about against between into through during
                  before after above below to from up down in out on off over under again further then once here
                  there when where why how all any both each few more most other some such no nor not only own same
                  so than too very s t can will just don should now].freeze

  def self.find_studies_by_gene_param(gene_param, study_ids)
    genes = sanitize_gene_params(gene_param)
    find_studies_by_genes(genes, study_ids)
  end

  # genes is an array of gene ids/names
  # study_ids is a list of study ids to limit the search to.
  # returns a hash of unique study ids, and also a hash of gene ids by study id
  def self.find_studies_by_genes(genes, study_ids)

    # limit gene search for performance reasons
    gene_matches = []

    gene_matches = Gene.where(:study_id.in => study_ids)
                       .any_of({:name.in => genes},
                               {:searchable_name.in => genes.map(&:downcase)},
                               {:gene_id.in => genes})
    gene_match_list = gene_matches.pluck(:id, :searchable_name, :study_id)
    genes_by_study = {}
    study_ids = []
    gene_match_list.map do |match|
      genes_by_study[match[2]] ||= []
      genes_by_study[match[2]].push(match[1])
      study_ids = study_ids.push(match[2])
    end
    {  genes_by_study: genes_by_study, study_ids: study_ids.uniq }
  end

  # takes a gene param string and returns a sanitized, leading/trailing space-stripped array of terms
  def self.sanitize_gene_params(genes)
    delimiter = genes.include?(',') ? ',' : ' '
    raw_genes = genes.split(delimiter)
    gene_array = RequestUtils.sanitize_search_terms(raw_genes).split(',').map(&:strip)
    # limit gene search for performance reasons
    if gene_array.size > MAX_GENE_SEARCH
      gene_array = gene_array.take(MAX_GENE_SEARCH)
    end
    gene_array.map(&:strip)
  end
end
