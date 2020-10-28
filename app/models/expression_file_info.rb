class ExpressionFileInfo
  include Mongoid::Document

  embedded_in :study_file

  field :library_construction_protocol, type: String
  field :units, type: String
  field :biosample_input_type, type: String
  field :multimodality, type: String
  field :is_raw_counts, type: Boolean, default: false

  # note that species and reference genome/annotation live at the study_file level, not here

  UNITS_VALUES = [nil, 'UMI-corrected raw counts', 'raw counts']
  validates :units, inclusion: {in: UNITS_VALUES}

  BIOSAMPLE_INPUT_TYPE_VALUES = [nil, 'Whole cell', 'Single nuclei', 'Bulk']
  validates :biosample_input_type, inclusion: {in: BIOSAMPLE_INPUT_TYPE_VALUES}

  MULTIMODALITY_VALUES = [nil, 'CITE-seq', 'Patch-seq']
  validates :multimodality, inclusion: {in: MULTIMODALITY_VALUES}

  LIBRARY_CONSTRUCTION_VALUES = [nil,
                                 '10x 3\' v1',
                                 '10x 3\' v2',
                                 '10x 3\' v3',
                                 '10x 5\' v2',
                                 '10x 5\' v3',
                                 'CEL-seq2',
                                 'Drop-seq',
                                 'inDrop',
                                 'MARS-seq',
                                 'sci-RNA-seq',
                                 'Seq-Well S^3',
                                 'Seq-Well v1',
                                 'Smart-like',
                                 'Smart-seq2/Fluidigm C1',
                                 'Smart-seq2/plate-based',
                                 # non-scRNAseq Assays
                                 # single cell ATAC-seq assays
                                 'dsc-ATAC-seq',
                                 'dsci-ATAC-seq',
                                 'scATAC-seq/10x',
                                 'scATAC-seq/Fluidigm',
                                 'sci-ATAC-seq',
                                 'scTHS-seq',
                                 'snATAC-seq',
                                 # spatial transcriptomics assays
                                 '10x Visium',
                                 'MERFISH',
                                 'osmFISH',
                                 'SeqFISH+',
                                 'Slide-seq',
                                 'smFISH',
                                 # single cell ChIP-seq assays
                                 'Drop-ChIP']
  validates :library_construction_protocol, inclusion: {in: LIBRARY_CONSTRUCTION_VALUES}
end
