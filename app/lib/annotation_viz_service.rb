class AnnotationVizService
  # set of utility methods used for interacting with annotation data
  def self.get_selected_annotation(study, cluster, annot_name, annot_type, annot_scope)
    # construct object based on name, type & scope
    case annot_scope
    when 'cluster'
      annotation_source = cluster.cell_annotations.find {|ca| ca[:name] == annot_name && ca[:type] == annot_type}
    when 'user'
      annotation_source = UserAnnotation.find(annot_name)
    else
      annotation_source = study.cell_metadata.by_name_and_type(annot_name, annot_type)
    end
    # rescue from an invalid annotation request by defaulting to the first cell metadatum present
    if annotation_source.nil?
      annotation_source = study.cell_metadata.first
    end
    populate_annotation_by_class(source: annotation_source, scope: annot_scope, type: annot_type)
  end

  # attempt to load an annotation based on instance class
  def self.populate_annotation_by_class(source:, scope:, type:)
    if source.is_a?(CellMetadatum)
      annotation = {name: source.name, type: source.annotation_type,
                    scope: 'study', values: source.values.to_a,
                    identifier: "#{source.name}--#{type}--#{scope}"}
    elsif source.is_a?(UserAnnotation)
      annotation = {name: source.name, type: type, scope: scope, values: source.values.to_a,
                    identifier: "#{source.id}--#{type}--#{scope}", id: source.id}
    elsif source.is_a?(Hash)
      annotation = {name: source[:name], type: type, scope: scope, values: source[:values].to_a,
                    identifier: "#{source[:name]}--#{type}--#{scope}"}
    end
    annotation
  end

  def self.get_study_annotation_options(study, user)
    subsample_thresholds = Hash[
      study.cluster_groups.map {|cluster| [cluster.name, ClusterVizService.subsampling_options(cluster)] }
    ]
    {
      default_cluster: study.default_cluster&.name,
      default_annotation: AnnotationVizService.get_selected_annotation(study, nil, nil, nil, nil),
      annotations: AnnotationVizService.available_annotations(study, nil, user),
      clusters: study.cluster_groups.pluck(:name),
      subsample_thresholds: subsample_thresholds
    }
  end

  # returns a flat array of annotation objects, with name, scope, annotation_type, and values for each
  def self.available_annotations(study, cluster, current_user, annotation_type=nil)
    annotations = []
    viewable = study.viewable_metadata
    metadata = annotation_type.nil? ? viewable : viewable.select {|m| m.annotation_type == annotation_type}
    metadata = metadata.map do |annot|
      {
        name: annot.name,
        type: annot.annotation_type,
        values: annot.values,
        scope: 'study'
      }
    end
    annotations.concat(metadata)
    cluster_annots = []
    if cluster.present?
      cluster_annots = ClusterVizService.available_annotations_by_cluster(cluster, annotation_type)
    else
      study.cluster_groups.each do |cluster_group|
        cluster_annots.concat(ClusterVizService.available_annotations_by_cluster(cluster_group, annotation_type))
      end
    end
    annotations.concat(cluster_annots)
    if current_user.present? && cluster.present?
      user_annotations = UserAnnotation.viewable_by_cluster(current_user, cluster)
      annotations.concat(user_annotations)
    end
    annotations
  end

  def self.annotation_cell_values_tsv(study, cluster, annotation)
    cells = cluster.concatenate_data_arrays('text', 'cells')
    if annotation[:scope] == 'cluster'
      annotations = cluster.concatenate_data_arrays(annotation[:name], 'annotations')
    else
      study_annotations = study.cell_metadata_values(annotation[:name], annotation[:type])
      annotations = []
      cells.each do |cell|
        annotations << study_annotations[cell]
      end
    end
    # assemble rows of data
    rows = []
    cells.each_with_index do |cell, index|
      rows << [cell, annotations[index]].join("\t")
    end
    headers = ['NAME', annotation[:name]]
    [headers.join("\t"), rows.join("\n")].join("\n")
  end
end
