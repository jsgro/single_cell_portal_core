require 'google/apis/genomics_v2alpha1'

##
# PapiClient: a lightweight wrapper around the Google Cloud Genomics V2 Alpha API for submitting/reporting
# scp-ingest-service jobs to ingest user-uploaded data to Firestore
#
# requires: googleauth, google-api-client, FireCloudClient class (for bucket access)
#
# Author::  Jon Bistline  (mailto:bistline@broadinstitute.org)

class PapiClient < Struct.new(:project, :service_account_credentials, :service)

  # Service account JSON credentials
  SERVICE_ACCOUNT_KEY = !ENV['SERVICE_ACCOUNT_KEY'].blank? ? File.absolute_path(ENV['SERVICE_ACCOUNT_KEY']) : ''
  # Google authentication scopes necessary for running pipelines
  GOOGLE_SCOPES = %w(https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/genomics https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_only)
  # GCP Compute project to run pipelines in
  COMPUTE_PROJECT = ENV['GOOGLE_CLOUD_PROJECT'].blank? ? '' : ENV['GOOGLE_CLOUD_PROJECT']
  # Docker image in GCP project to pull for running ingest jobs
  INGEST_DOCKER_IMAGE = "gcr.io/broad-singlecellportal-staging/ingest-pipeline:0.2.0_3da44bf"
  # List of scp-ingest-pipeline actions and their allowed file types
  FILE_TYPES_BY_ACTION = {
      ingest_expression: ['Expression Matrix', 'MM Coordinate Matrix'],
      ingest_cluster: ['Cluster'],
      ingest_cell_metadata: ['Metadata'],
      ingest_subsample: ['Cluster']
  }

  # Default constructor for PapiClient
  #
  # * *params*
  #   - +project+: (String) => GCP Project to use (can be overridden by other parameters)
  #   - +project+: (Path) => Absolute filepath to service account credentials
  # * *return*
  #   - +PapiClient+
  def initialize(project=COMPUTE_PROJECT, service_account_credentials=SERVICE_ACCOUNT_KEY)

    credentials = {
        scope: GOOGLE_SCOPES
    }

    if SERVICE_ACCOUNT_KEY.present?
      credentials.merge!({json_key_io: File.open(service_account)})
    end

    authorizer = Google::Auth::ServiceAccountCredentials.make_creds(credentials)
    genomics_service = Google::Apis::GenomicsV2alpha1::GenomicsService.new
    genomics_service.authorization = authorizer

    self.project = project
    self.service_account_credentials = service_account_credentials
    self.service = genomics_service
  end

  # Return the service account email
  #
  # * *return*
  #   - (String) Service Account email
  def issuer
    self.service.authorization.issuer
  end

  # Runs a pipeline.  Will call sub-methods to instantiate required objects to pass to
  # Google::Apis::GenomicsV2alpha1::GenomicsService.run_pipeline
  #
  # * *params*
  #   - +study_file+ (StudyFile) => File to be ingested
  #   - +user+ (User) => User performing ingest action
  #   - +action+ (String) => Action that is being performed, maps to Ingest pipeline action
  #     (e.g. 'ingest_cell_metadata', 'subsample')
  #
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::Operation
  #
  # * *raises*
  #   - Google::Apis::ServerError => An error occurred on the server and the request can be retried
  #   - Google::Apis::ClientError =>  The request is invalid and should not be retried without modification
  #   - Google::Apis::AuthorizationError => Authorization is required
  def run_pipeline(study_file: , user:, action:)
    study = study_file.study
    accession = study.accession
    resources = self.create_resources_object(regions: ['us-east4'])
    command_line = self.get_command_line(study_file: study_file, action: action)
    labels = {
        study_accession: accession,
        user_id: user.id.to_s,
        file_id: study_file.id.to_s,
        action: action,
        docker_image: INGEST_DOCKER_IMAGE
    }
    action = self.create_actions_object(commands: [command_line])
    pipeline = self.create_pipeline_object(actions: [action], environment: {}, resources: resources)
    pipeline_request = self.create_run_pipeline_request_object(pipeline: pipeline, labels: labels)
    self.service.run_pipeline(pipeline_request, quota_user: user.id.to_s)
  end

  # Get an existing pipeline run
  #
  # * *params*
  #   - +name+ () => Operation corresponding with a submission of ingest
  #   - +fields+ (String) => Selector specifying which fields to include in a partial response.
  #   - +user+ (User) => User that originally submitted pipeline
  #
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::Operation
  def get_pipeline(name: , fields: nil, user: nil)
    quota_user = user.present? ? user.id.to_s : nil
    self.service.get_project_operation(name, fields: fields, quota_user: quota_user)
  end

  # Create a run pipeline request object to send to service.run_pipeline
  #
  # * *params*
  #   - +pipeline+ (Google::Apis::GenomicsV2alpha1::Pipeline) => Pipeline object from create_pipeline_object
  #   - +labels+ (Hash) => Hash of key/value pairs to set as the pipeline labels
  #
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::RunPipelineRequest
  def create_run_pipeline_request_object(pipeline:, labels: {})
    Google::Apis::GenomicsV2alpha1::RunPipelineRequest.new(
        pipeline: pipeline,
        labels: labels
    )
  end

  # Create a pipeline object detailing all required information in order to run an ingest job
  #
  # * *params*
  #   - +actions+ (Array<Google::Apis::GenomicsV2alpha1::Action>) => actions to perform, from create_actions_object
  #   - +environment+ (Hash) => Hash of key/value pairs to set as the container env
  #   - +resources+ (Google::Apis::GenomicsV2alpha1::Resources) => Resources object from create_resources_object
  #   - +timeout+ (String) => Maximum runtime of pipeline (defaults to 1 week)
  #
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::Pipeline
  def create_pipeline_object(actions:, environment:, resources:, timeout: nil)
    Google::Apis::GenomicsV2alpha1::Pipeline.new(
        actions: actions,
        environment: environment,
        resources: resources,
        timeout: timeout
    )
  end

  # Instantiate actions for pipeline, which holds command line actions, docker information,
  # and information that is passed to run_pipeline.  The Docker image that is pulled for this
  # is hard-coded to PapiClient::INGEST_DOCKER_IMAGE
  #
  # * *params*
  #   - +commands+: (Array<String>) => An array of commands to run inside the container
  #   - +environment+: (Hash) => Hash of key/value pairs to set as the container env
  #   - +flags+: (Array<String>) => An array of flags to apply to the action
  #   - +image_uri+: (String) => GCR Docker image to pull, defaults to PapiClient::INGEST_DOCKER_IMAGE
  #   - +labels+: (Hash) => Hash of labels to associate with the action
  #   - +timeout+: (String) => Maximum runtime of action
  #
  #  * *return*
  #   - Google::Apis::GenomicsV2alpha1::Action
  def create_actions_object(commands: [], environment: {}, flags: [], labels: {}, timeout: nil)
    Google::Apis::GenomicsV2alpha1::Action.new(
        commands: commands,
        environment: environment,
        flags: flags,
        image_uri: INGEST_DOCKER_IMAGE,
        labels: labels,
        timeout: timeout
    )
  end

  # Instatiate a resources object to tell where to run a pipeline
  #
  # * *params*
  #   - regions: (Array<String>) => An array of GCP regions allowed for VM allocation
  #
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::Resources
  def create_resources_object(regions:)
    Google::Apis::GenomicsV2alpha1::Resources.new(
         project_id: COMPUTE_PROJECT,
         regions: regions,
         virtual_machine: self.create_virtual_machine_object
    )
  end

  # Instantiate a VM object to specify in resources.  Assigns the portal service account to the VM
  # to manage permissions
  #
  # * *params*
  #   - +machine_type+ (String) => GCP VM machine type (defaults to 'n1-standard-1')
  #   - +preemptible+ (Boolean) => Indication of whether VM can be preempted ()
  # * *return*
  #   - Google::Apis::GenomicsV2alpha1::VirtualMachine
  def create_virtual_machine_object(machine_type: 'n1-standard-1', preemptible: true)
    Google::Apis::GenomicsV2alpha1::VirtualMachine.new(
        machine_type: machine_type,
        preemptible: preemptible,
        service_account: Google::Apis::GenomicsV2alpha1::ServiceAccount.new(email: self.issuer, scopes: GOOGLE_SCOPES)
    )
  end

  # Determine command line to pass to ingest based off of file & action requested
  #
  # * *params*
  #   - +study_file+ (StudyFile) => StudyFile to be ingested
  #   - +action+ (String/Symbol) => Action to perform on ingest
  #
  # * *return*
  #   - Command Line (String)
  #
  # * *raises*
  #   - ArgumentError => The requested StudyFile and action do not correspond with each other, or cannot be run yet
  def get_command_line(study_file:, action:)
    validate_action_by_file(action, study_file)
    command_line = "python ingest_pipeline.py #{action}"
    study = study_file.study
    case action.to_s
    when 'ingest_expression'
      if study_file.file_type == 'Expression Matrix'
        command_line += " --matrix-file #{study_file.gs_url} --matrix-file-type dense"
      elsif study_file.file_type === 'MM Coordinate Matrix'
        bundled_files = study_file.bundled_files
        genes_file = bundled_files.detect {|f| f.file_type == '10X Genes File'}
        barcodes_file = bundled_files.detect {|f| f.file_type == '10X Barcodes File'}
        command_line += " --matrix-file #{study_file.gs_url} --matrix-file-type mtx" \
                      " --gene-file #{genes_file.gs_url} --barcode-file #{barcodes_file.gs_url}"
      end
    when 'ingest_cell_metadata'
      command_line += " --cell-metadata-file #{study_file.gs_url} --ingest-cell-metadata"
    when 'ingest_cluster'
      command_line += " --cluster-file #{study_file.gs_url} --ingest-cluster"
    when 'ingest_subsample'
      metadata_file = study.metadata_file
      command_line += " --cluster-file #{study_file.gs_url} --cell-metadata-file #{metadata_file.gs_url} --subsample"
    end

    command_line
  end

  private

  def validate_action_by_file(action, study_file)
    if !study_file.able_to_parse?
      raise ArgumentError.new("'#{study_file.upload_file_name}' is not parseable or missing required bundled files")
    elsif !FILE_TYPES_BY_ACTION[action.to_sym].include?(study_file.file_type)
      raise ArgumentError.new("'#{action}' cannot be run with file type '#{study_file.file_type}'")
    end
  end
end
