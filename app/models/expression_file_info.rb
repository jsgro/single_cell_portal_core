class ExpressionFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :library_preparation_protocol, type: String
  field :units, type: String
  field :biosample_input_type, type: String
  field :multimodality, type: String
  field :is_raw_counts, type: Boolean, default: false

  # note that species and reference genome/annotation live at the study_file level, not here

  UNITS_VALUES = ['UMI-corrected raw counts', 'raw counts']
  validates :units, inclusion: {in: UNITS_VALUES}, allow_blank: true

  BIOSAMPLE_INPUT_TYPE_VALUES = ['whole cell', 'single nuclei', 'bulk']
  validates :biosample_input_type, inclusion: {in: BIOSAMPLE_INPUT_TYPE_VALUES}, allow_blank: true

  MULTIMODALITY_VALUES = ['CITE-seq', 'Patch-seq']
  validates :multimodality, inclusion: {in: MULTIMODALITY_VALUES}, allow_blank: true

  LIBRARY_PREPARATION_VALUES = ['Smart-seq2/Fluidigm C1',
                                 'MARS-seq',
                                 'Seq-Well v1',
                                 'Seq-Well S^3',
                                 'inDrop',
                                 'sci-RNA-seq',
                                 '10x 3\' v1',
                                 '10x 3\' v2',
                                 '10x 3\' v3',
                                 '10x 5\' v2',
                                 '10x 5\' v3',
                                 'CEL-seq2',
                                 'Drop-seq',
                                 'SCRB-seq',
                                 'ATAC-seq',
                                 'ChIP-seq',
                                 'methylomics']
  validates :library_preparation_protocol, inclusion: {in: LIBRARY_PREPARATION_VALUES}, allow_blank: true
  validate :unset_units_unless_raw_counts

  private

  # unset the value for :units unless :is_raw_counts is true
  # this has to be invoked as a validation as callbacks only fire on parent document (StudyFile)
  def unset_units_unless_raw_counts
    unless self.is_raw_counts
      self.units = nil
    end
  end
end
