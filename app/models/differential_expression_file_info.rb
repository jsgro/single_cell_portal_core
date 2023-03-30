# top-level info about DE results contained in a user-uploaded file
class DifferentialExpressionFileInfo
  include Mongoid::Document

  ANNOTATION_PARAMS = %i[annotation_name annotation_scope].freeze

  embedded_in :study_file
  belongs_to :cluster_group

  # user-uploaded files could contain results for multiple annotations
  field :annotations, type: Array, default: []
  field :computational_method, type: String, default: DifferentialExpressionResult::DEFAULT_COMP_METHOD
  field :analysis_type, type: String, default: DifferentialExpressionResult::DEFAULT_ANALYSIS

  validates :computational_method, inclusion: { in: DifferentialExpressionResult::SUPPORTED_COMP_METHODS }
  validates :analysis_type, inclusion: { in: DifferentialExpressionResult::ANALYSIS_TYPES }
  validate :validate_annotations

  # retrieve source annotation object
  def annotation_object(annotation)
    safe_annot = annotation.with_indifferent_access
    annotation_name = safe_annot[:annotation_name]
    annotation_scope = safe_annot[:annotation_scope]
    case annotation_scope
    when 'study'
      study.cell_metadata.by_name_and_type(annotation_name, 'group')
    when 'cluster'
      cluster_group.cell_annotations.detect do |annot|
        annot[:name] == annotation_name && annot[:type] == 'group'
      end
    end
  end

  private

  # ensure annotation info has required keys and there are no duplicate entries
  def validate_annotations
    annotations.each do |annotation|
      if annotation.keys & ANNOTATION_PARAMS != ANNOTATION_PARAMS
        errors.add(:annotations,
                   "has an invalid entry; must have values for #{ANNOTATION_PARAMS.join(', ')}: #{annotation}")
      end
    end
    duplicates = annotations.map(&:with_indifferent_access).tally.select { |_, v| v > 1 }.keys
    if duplicates.any?
      errors.add(:annotations, "contains duplicate entries: #{duplicates.join(', ')}")
    end
  end
end
