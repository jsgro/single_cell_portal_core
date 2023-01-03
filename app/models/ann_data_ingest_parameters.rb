# handles launching ingest jobs for AnnData files and derived SCP file fragments
# usage patterns:
# extract SCP files: AnnDataIngestParameters.new(anndata_file: study_file.gs_url)
# parse extracted cluster file: AnnDataIngestParameters.new(
#   ingest_anndata: false, extract_cluster: false, name: 'X_tsne', ingest_cluster: true, domain_ranges: "{}",
#   cluster_file: 'gs://bucket-id/_scp_internal/anndata_ingest/<study_file_ID_of_h5ad_file>/h5ad_frag.cluster.X_tsne.tsv', 
#   obsm_keys: nil, extract_metadata: false, metadata_file: nil, ingest_metadata: false
# )
# parse extracted metadata file: AnnDataIngestParameters.new(
#   ingest_anndata: false, extract_cluster: false, name: 'X_tsne', ingest_cluster: false, domain_ranges: nil
#   cluster_file: nil, obsm_keys: nil, extract_metadata: false, metadata_file: 'gs://bucket-id/_scp_internal/anndata_ingest/<study_file_ID_of_h5ad_file>/h5ad_frag.metadata.tsv', 
#   ingest_metadata: true
# )

class AnnDataIngestParameters
  include ActiveModel::Model
  include Parameterizable

  # ingest_anndata: gate primary validation/extraction of AnnData file
  # anndata_file: GS URL for AnnData file
  # extract_cluster: gate cluster file extraction
  # obsm_keys: data slots containing clustering information
  # ingest_cluster: gate ingesting an extracted cluster file
  # cluster_file: GS URL for extracted cluster file
  # name: name of ClusterGroup (from obsm_keys)
  # domain_ranges: domain ranges for ClusterGroup, if present
  # extract_metadata: gate metadata file extraction
  # metadata_file: GS URL for extracted metadata file
  # ingest_metadata: gate ingesting an extracted metadata file
  attr_accessor :ingest_anndata, :anndata_file, :extract_cluster, :obsm_keys, :ingest_cluster, :cluster_file, :name,
                :domain_ranges, :extract_metadata, :metadata_file, :ingest_metadata

  validates :anndata_file, :cluster_file, :metadata_file,
            format: { with: Parameterizable::GS_URL_REGEXP, message: 'is not a valid GS url' },
            allow_blank: true

  # default values for parameters
  # attributes marked as true are passed to the command line as a standalone flag with no value, e.g. --extract-cluster
  # any parameters that are set to nil/false will not be passed to the command line
  PARAM_DEFAULTS = {
    ingest_anndata: true,
    extract_cluster: true,
    obsm_keys: "['X_umap','X_tsne']",
    ingest_cluster: false,
    cluster_file: nil,
    name: nil,
    domain_ranges: nil,
    extract_metadata: true,
    metadata_file: nil,
    ingest_metadata: false
  }.freeze

  ARRAY_MATCHER = /[\[\]]/
  QUOTE_MATCHER = /["']/

  def initialize(attributes = {})
    PARAM_DEFAULTS.each do |attribute_name, default|
      send("#{attribute_name}=", default) if default.present?
    end
    super
  end

  def attributes
    {
      ingest_anndata:, anndata_file:, extract_cluster:, obsm_keys:, ingest_cluster:, cluster_file:,
      name:, domain_ranges:, extract_metadata:, metadata_file:, ingest_metadata:
    }.with_indifferent_access
  end

  # generate a GS URL to a derived fragment that was extracted from the parent AnnData file
  # File name structure is: <input_filetype>_frag.<file_type>.<file_type_detail>.tsv
  #   file_type = cluster|metadata|matrix
  #   file_type_detail [optional] = cluster name (for cluster files), raw|processed (for matrix files)
  def fragment_file_gs_url(bucket_id, fragment_type, h5ad_file_id, file_type_detail = "")
    input_filetype = 'h5ad' # currently only have Anndata/h5ad data but one day might have Loom or Seurat
    main_url = "gs://#{bucket_id}/_scp_internal/anndata_ingest/#{h5ad_file_id}/#{input_filetype}_frag.#{fragment_type}.#{file_type_detail}.tsv"
  end

  # convert a string value into an array of strings, like obsm_keys
  def attribute_as_array(attr)
    stripped_value = attributes[attr].gsub(ARRAY_MATCHER, '')
    stripped_value.split(',').map { |substr| substr.gsub(QUOTE_MATCHER, '').strip }
  end
end
