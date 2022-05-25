# handle launching differential expression ingest jobs
class DifferentialExpressionService
  # handle setting up and launching a differential expression job
  #
  # * *params*
  #   - +cluster_file+      (StudyFile) => Clustering file being used as control cell list
  #   - +study+            (Study) => Study to which StudyFile belongs
  #   - +user+             (User) => User initiating parse action (for email delivery)
  #   - +annotation_name+  (String) => Name of requested annotation
  #   - +annotation_type+  (String) => Type of requested annotation (should be 'group')
  #   - +annotation_scope+ (String) => Scope of requested annotation ('study' or 'cluster')
  #
  # * *yields*
  #   - (IngestJob) => Differential expression job in PAPI
  #
  # * *returns*
  #   - (Boolean) => True if job queues successfully
  #
  # * *raises*
  #   - (ArgumentError) => if requested parameters do not validate
  def self.run_differential_expression_job(cluster_file, study, user, annotation_name:, annotation_type:, annotation_scope:)
    validate_annotation(cluster_file, study, annotation_name, annotation_type, annotation_scope)

    # begin assembling parameters
    de_params = {
      annotation_name: annotation_name,
      annotation_type: annotation_type,
      annotation_scope: annotation_scope,
      annotation_file: annotation_scope == 'cluster' ? cluster_file.gs_url : study.metadata_file.gs_url,
      cluster_file: cluster_file.gs_url,
      cluster_name: cluster_file.name
    }

    cluster = study.cluster_groups.by_name(cluster_file.name)
    raw_matrix = ClusterVizService.raw_matrix_for_cluster_cells(study, cluster)

    de_params[:matrix_file_path] = raw_matrix.gs_url
    if raw_matrix.file_type == 'MM Coordinate Matrix'
      de_params[:matrix_file_type] = 'sparse'
      gene_file = raw_matrix.bundled_file_by_type('10X Genes File')
      barcode_file = raw_matrix.bundled_file_by_type('10X Barcodes File')
      de_params[:gene_file] = gene_file.gs_url
      de_params[:barcode_file] = barcode_file.gs_url
    else
      de_params[:matrix_file_type] = 'dense'
    end
    params_object = DifferentialExpressionParameters.new(de_params)

    if params_object.valid?
      # launch DE job
      job = IngestJob.new(study: study, study_file: cluster_file, user: user, action: :differential_expression,
                          params_object: params_object)
      job.delay.push_remote_and_launch_ingest(skip_push: true) # skip push as file is already in bucket
      true
    else
      raise ArgumentError, "job parameters failed to validate: #{params_object.errors.full_messages}"
    end
  end

  # validate annotation exists and can be visualized for a DE job
  #
  # * *params*
  #   - +cluster_file+      (StudyFile) => Clustering file being used as control cell list
  #   - +study+            (Study) => Study to which StudyFile belongs
  #   - +annotation_name+  (String) => Name of requested annotation
  #   - +annotation_type+  (String) => Type of requested annotation (should be 'group')
  #   - +annotation_scope+ (String) => Scope of requested annotation ('study' or 'cluster')
  #
  # * *raises*
  #   - (ArgumentError) => if requested parameters do not validate
  def self.validate_annotation(cluster_file, study, annotation_name, annotation_type, annotation_scope)
    cluster = study.cluster_groups.by_name(cluster_file.name)
    raise ArgumentError, "cannot find cluster for #{cluster_file.name}" if cluster.nil?

    can_visualize = false
    if annotation_scope == 'cluster'
      annotation = cluster.cell_annotations&.detect do |annot|
        annot[:name] == annotation_name && annot[:type] == annotation_type
      end
      can_visualize = annotation && cluster.can_visualize_cell_annotation?(annotation)
    else
      annotation = study.cell_metadata.by_name_and_type(annotation_name, annotation_type)
      can_visualize = annotation&.can_visualize?
    end

    identifier = "#{annotation_name}--#{annotation_type}--#{annotation_scope}"
    raise ArgumentError, "#{identifier} is not present" if annotation.nil?
    raise ArgumentError, "#{identifier} cannot be visualized" unless can_visualize
  end
end
