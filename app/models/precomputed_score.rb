class PrecomputedScore

  ###
  #
  # PrecomputedScore: gene-list based class that holds key/value pairs of genes and gene expression scores as well as cluster labels
  #
  ###

  include Mongoid::Document

  belongs_to :study
  belongs_to :study_file

  field :name, type: String
  field :clusters, type: Array
  field :gene_scores, type: Array

  index({ study_id: 1 }, { unique: false, background: true })

  validates_uniqueness_of :name, scope: :study_id
  validates_presence_of :name, :clusters, :gene_scores
  validates_format_of :name, with: ValidationTools::URL_PARAM_SAFE,
                      message: ValidationTools::URL_PARAM_SAFE_ERROR

  def gene_list
    self.gene_scores.map(&:keys).flatten
  end

  # convert this gene list into a GCT-formatted string
  # the gene_scores attribute is an array of gene-level expression scores for each "cluster"
  # a "cluster" in this context is simply an annotation value that was pre-defined by the study owner
  # for which each gene provided was given a summary expression value, hence: "precomputed score"
  def to_gct
    headers = %w(Name Description)
    headers += self.clusters
    cols = self.clusters.size
    rows = []
    self.gene_scores.each do |scores_hash|
      gene_name = scores_hash.keys.first
      exp_scores = scores_hash[gene_name]
      row = [gene_name, '']
      self.clusters.each do |cluster_name|
        row << exp_scores[cluster_name]
      end
      rows << row.join("\t")
    end
    row_data = ['#1.2', [rows.size, cols].join("\t"), headers.join("\t"), rows.join("\n")]
    row_data.join("\n")
  end

  # render a plain tsv file for use in Morpheus for rendering dot plots/heatmaps (controls column rendering)
  def cluster_values_tsv
    headers = ['NAME', self.name].join("\t")
    # since the "cluster" value is both the column name & value, create a nested array with repeated values
    rows = []
    self.clusters.each do |cluster_name|
      rows << "#{cluster_name}\t#{cluster_name}"
    end
    [headers, rows].join("\n")
  end
end
