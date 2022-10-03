class RenderExpressionArraysParameters
  include ActiveModel::Model
  include Parameterizable

  MACHINE_TYPE = 'n1-highcpu-96'.freeze # largest N1 CPU machine

  # name of Python parameter that invokes correct parser
  PARAMETER_NAME = '--render-expression-arrays'.freeze

  # cluster_file: clustering file with cells to use as control list for rendering expression arrays
  # cluster_name: name of associated ClusterGroup object
  # matrix_file_path: processed expression matrix with source expression data
  # matrix_file_type: type of processed matrix (dense, sparse)
  # gene_file (optional): genes/features file for sparse matrix
  # barcode_file (optional): barcodes file for sparse matrix
  attr_accessor :cluster_file, :cluster_name, :matrix_file_path, :matrix_file_type, :gene_file, :barcode_file

  validates :cluster_file, :cluster_name, :matrix_file_path, :matrix_file_type, presence: true
  validates :cluster_file, :matrix_file_path,
            format: { with: Parameterizable::GS_URL_REGEXP, message: 'is not a valid GS url' }
  validates :matrix_file_type, inclusion: %w[dense mtx]
  validates :gene_file, :barcode_file,
            presence: true,
            format: {
              with: Parameterizable::GS_URL_REGEXP,
              message: 'is not a valid GS url'
            },
            if: -> { matrix_file_type == 'mtx' }

  def initialize(attributes = {})
    super
  end

  # machine_type for PAPI jobs, hard coded to MACHINE_TYPE
  # note: this is not a configurable parameter, is only implemented to use with PapiClient#create_virtual_machine_object
  def machine_type
    MACHINE_TYPE
  end

  # default attributes hash
  def attributes
    {
      cluster_file: cluster_file,
      cluster_name: cluster_name,
      matrix_file_path: matrix_file_path,
      matrix_file_type: matrix_file_type,
      gene_file: gene_file,
      barcode_file: barcode_file
    }.with_indifferent_access
  end
end
