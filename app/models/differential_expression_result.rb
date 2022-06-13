# store pointers to differential expression output sets for a given cluster/annotation
class DifferentialExpressionResult
  include Mongoid::Document
  include Mongoid::Timestamps

  # minimum number of observed_values, or cells per observed_value
  MIN_OBSERVED_VALUES = 2

  belongs_to :study
  belongs_to :cluster_group

  field :cluster_name, type: String # cache name of cluster at time of creation to avoid renaming issues
  field :observed_values, type: Array, default: []
  field :annotation_name, type: String
  field :annotation_scope, type: String

  validates :annotation_scope, inclusion: { in: %w[study cluster] }
  validates :annotation_name, :cluster_name, presence: true
  validate :has_observed_values?

  before_validation :set_observed_values, :set_cluster_name

  # pointer to source annotation object, either CellMetadatum of ClusterGroup#cell_annotation
  def annotation_object
    case annotation_scope
    when 'study'
      study.cell_metadata.by_name_and_type(annotation_name, 'group')
    when 'cluster'
      cluster_group.cell_annotations.detect do |annotation|
        annotation[:name] == annotation_name && annotation[:scope] == 'group'
      end
    end
  end

  # get query string formatted annotation identifier, e.g. cell_type__ontology_label--group--study
  def annotation_identifier
    case annotation_scope
    when 'study'
      annotation_object.annotation_select_value
    when 'cluster'
      cluster_group.annotation_select_value(annotation_object)
    end
  end

  # compute the relative path inside a GCS bucket of a DE output file for a given label
  def bucket_path_for(label)
    "_scp_internal/differential_expression/#{filename_for(label)}"
  end

  # individual filename of label-specific result
  def filename_for(label)
    basename = [
      cluster_name,
      annotation_name,
      label,
      annotation_scope,
      'wilcoxon'
    ].map { |val| val.gsub(/\W+/, '_') }.join('--')
    "#{basename}.tsv"
  end

  # map of all observed result files, of label value => label-specific filenames
  # this is important as it sidesteps the issue of study owners renaming clusters, as cluster_name is cached here
  def result_files
    files = observed_values.map { |label| filename_for(label) }
    Hash[observed_values.zip(files)]
  end

  private

  # find the intersection of annotation values from the source, filtered for cells observed in cluster
  def set_observed_values
    cells_by_label = ClusterVizService.cells_by_annotation_label(cluster_group,
                                                                 annotation_name,
                                                                 'group',
                                                                 annotation_scope)
    observed = cells_by_label.keys.reject { |label| cells_by_label[label].count < MIN_OBSERVED_VALUES }
    self.observed_values = observed
  end

  def set_cluster_name
    self.cluster_name = cluster_group.name
  end

  def has_observed_values?
    if observed_values.count < MIN_OBSERVED_VALUES
      errors.add(:observed_values, "must have at least #{MIN_OBSERVED_VALUES} values")
    end
  end
end
