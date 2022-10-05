# class to hold parameters specific to differential expression jobs in PAPI
class DifferentialExpressionParameters
  include ActiveModel::Model
  include ActiveModel::Attributes
  include Parameterizable
  include IndifferentAttributes

  # acceptable Google N1 machine types
  # https://cloud.google.com/compute/docs/general-purpose-machines#n1-high-memory
  GOOGLE_VM_MACHINE_TYPES = [2, 4, 8, 16, 32, 64, 96].map { |i| "n1-highmem-#{i}" }.freeze

  # name of Python parameter that invokes correct parser
  PARAMETER_NAME = '--differential-expression'.freeze

  attribute :annotation_name, :string # name of annotation to use for DE
  attribute :annotation_scope, :string # scope of annotation (study, cluster)
  attribute :annotation_file, :string # source file for above annotation
  attribute :cluster_file, :string # clustering file with cells to use as control list for DE
  attribute :cluster_name, :string # name of associated ClusterGroup object
  attribute :matrix_file_path, :string # raw counts matrix with source expression data
  attribute :matrix_file_type, :string # type of raw counts matrix (dense, sparse)
  attribute :gene_file, :string # genes/features file for sparse matrix
  attribute :barcode_file, :string #  barcodes file for sparse matrix
  attribute :machine_type, :string, default: 'n1-highmem-8' #  override for default ingest machine type

  validates :annotation_name, :annotation_scope, :annotation_file, :cluster_file,
            :cluster_name, :matrix_file_path, :matrix_file_type, presence: true
  validates :annotation_file, :cluster_file, :matrix_file_path,
            format: { with: Parameterizable::GS_URL_REGEXP, message: 'is not a valid GS url' }
  validates :annotation_scope, inclusion: %w[cluster study]
  validates :matrix_file_type, inclusion: %w[dense mtx]
  validates :machine_type, inclusion: GOOGLE_VM_MACHINE_TYPES
  validates :gene_file, :barcode_file,
            presence: true,
            format: {
              with: Parameterizable::GS_URL_REGEXP,
              message: 'is not a valid GS url'
            },
            if: -> { matrix_file_type == 'mtx' }

  # overwrite :attributes method to merge in :annotation_type
  def attributes
    indifferent_attributes.merge({ annotation_type: 'group' })
  end
end
