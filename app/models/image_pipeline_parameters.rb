class ImagePipelineParameters
  include ActiveModel::Model
  include Parameterizable

  attr_accessor :accession, :bucket, :cluster, :environment, :cores, :docker_image, :machine_type

  validates :accession, :bucket, :cluster, :environment, :cores, presence: true

  # default values for all jobs
  PARAM_DEFAULTS = {
    docker_image: 'gcr.io/broad-singlecellportal-staging/image-pipeline:0.1.0_e2992be5b',
    machine_type: 'n1-highcpu-96'
  }.freeze

  def initialize(attributes = {})
    super
    @docker_image ||= PARAM_DEFAULTS[:docker_image]
    @machine_type ||= PARAM_DEFAULTS[:machine_type]
  end

  # default attributes hash
  def attributes
    {
      accession:, bucket:, cluster:, environment:, cores:
    }.with_indifferent_access
  end
end
