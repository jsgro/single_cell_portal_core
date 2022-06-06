# class to hold parameters specific to differential expression jobs in PAPI
class DifferentialExpressionParameters
  include ActiveModel::Model

  # regular expression to validate GS url format
  GS_URL_REGEXP = %r{\Ags://}.freeze

  # annotation_name: name of annotation to use for DE
  # annotation_type: type of annotation, must be 'group'
  # annotation_scope: scope of annotation (study, cluster)
  # annotation_file: source file for above annotation
  # cluster_file: clustering file with cells to use as control list for DE
  # cluster_name: name of associated ClusterGroup object
  # matrix_file_path: raw counts matrix with source expression data
  # matrix_file_type: type of raw counts matrix (dense, sparse)
  # gene_file (optional): genes/features file for sparse matrix
  # barcode_file (optional): barcodes file for sparse matrix
  attr_accessor :annotation_name, :annotation_type, :annotation_scope, :annotation_file, :cluster_file,
                :cluster_name, :matrix_file_path, :matrix_file_type, :gene_file, :barcode_file

  validates :annotation_name, :annotation_type, :annotation_scope, :annotation_file, :cluster_file,
            :cluster_name, :matrix_file_path, :matrix_file_type, presence: true
  validates :annotation_file, :cluster_file, :matrix_file_path,
            format: { with: GS_URL_REGEXP, message: 'is not a valid GS url' }
  validates :annotation_type, inclusion: %w[group]
  validates :annotation_scope, inclusion: %w[cluster study]
  validates :matrix_file_type, inclusion: %w[dense mtx]
  validates :gene_file, :barcode_file,
            presence: true,
            format: {
              with: GS_URL_REGEXP,
              message: 'is not a valid GS url'
            },
            if: -> { matrix_file_type == 'mtx' }

  # convert attribute name into CLI-formatted option
  def self.to_cli_opt(param_name)
    "--#{param_name.to_s.gsub(/_/, '-')}"
  end

  # default attributes hash
  def attributes
    {
      annotation_name: annotation_name,
      annotation_type: annotation_type,
      annotation_scope: annotation_scope,
      annotation_file: annotation_file,
      cluster_file: cluster_file,
      cluster_name: cluster_name,
      matrix_file_path: matrix_file_path,
      matrix_file_type: matrix_file_type,
      gene_file: gene_file,
      barcode_file: barcode_file
    }.with_indifferent_access
  end

  # return array of all initialized attributes in Python CLI form, e.g. annotation_name => --annotation-name
  # will also append --differential-expression at the end
  def to_options_array
    options_array = []
    attributes.each do |attr_name, value|
      options_array += [self.class.to_cli_opt(attr_name), value] if value.present?
    end
    options_array << '--differential-expression'
    options_array
  end
end
