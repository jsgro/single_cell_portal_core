class ExpressionFileInfo
  include Mongoid::Document
  field :library_construction_protocol, type: String
  field :units, type: String
  field :is_raw_counts, type: Boolean, default: false

  UNITS_VALUES = [nil, 'UMI-corrected raw counts', 'raw counts']
  validates :units, inclusion: {in: UNITS_VALUES}
  LIBRARY_CONSTRUCTION_VALUES = [nil,
                                 'Smart-seq2/Fluidigm C1',
                                 'Mars-seq',
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
                                 'ATAC-seq']
  validates :library_construction_protocol, inclusion: {in: LIBRARY_CONSTRUCTION_VALUES}
end
