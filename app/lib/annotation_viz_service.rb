class AnnotationVizService
  # set of utility methods used for interacting with annotation data

  # global label for dealing with blank/nil group-based annotation values
  MISSING_VALUE_LABEL = '--Unspecified--'.freeze

  # Retrieves an object representing the selected annotation. If nil is passed for the last four
  # arguments, it will get the study's default annotation instead
  # Params:
  # - study: the Study object
  # - cluster: ClusterGroup object (or nil for study-wide annotations)
  # - annot_name: string name of the annotation
  # - annot_type: string type (group or numeric)
  # - annot_scope: string scope (study, cluster, or user)
  # Returns:
  # - See populate_annotation_by_class for the object structure
  def self.get_selected_annotation(study, cluster: nil, annot_name: nil, annot_type: nil, annot_scope: nil)
    # construct object based on name, type & scope
    if annot_name.blank?
      # get the default annotation
      default_annot = nil
      if annot_scope == 'study'
        # get the default study-wide annotation
        default_annot = study.default_annotation(nil)
      elsif cluster.present?
        # get the default annotation for the cluster
        default_annot = study.default_annotation(cluster)
      else
        # get the default annotation for the default cluster
        default_annot = study.default_annotation
      end

      if !default_annot.blank?
        annot_name, annot_type, annot_scope = default_annot.split('--')
        if cluster.blank?
          cluster = study.default_cluster
        end
      end
    end

    case annot_scope
    when 'cluster'
      annotation_source = cluster.cell_annotations.find {|ca| ca[:name] == annot_name && ca[:type] == annot_type}
      if annotation_source.nil?
        # if there's no match, default to the first annotation
        annotation_source = cluster.cell_annotations.first
      end
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
  # Params:
  # - source: A ClusterGroup cell_annotation, a UserAnnotation, or a CellMetadatum object
  # Returns:
  # - {
  #     name: string name of annotation
  #     type: string type
  #     scope: string scope
  #     values: unique values for the annotation
  #     identifier: string in the form of "{name}--{type}--{scope}", suitable for frontend options selectors
  #   }
  def self.populate_annotation_by_class(source:, scope:, type:)
    if source.is_a?(CellMetadatum)
      annotation = {name: source.name, type: source.annotation_type,
                    scope: 'study', values: sanitize_values_array(source.values.to_a, type),
                    identifier: "#{source.name}--#{type}--#{scope}"}
    elsif source.is_a?(UserAnnotation)
      annotation = {name: source.name, type: type, scope: scope, values: sanitize_values_array(source.values.to_a, type),
                    identifier: "#{source.id}--#{type}--#{scope}", id: source.id}
    elsif source.is_a?(Hash)
      annotation = {name: source[:name], type: type, scope: scope, values: sanitize_values_array(source[:values].to_a, type),
                    identifier: "#{source[:name]}--#{type}--#{scope}"}
    end
    annotation
  end

  def self.get_study_annotation_options(study, user)
    subsample_thresholds = Hash[
      study.cluster_groups.map {|cluster| [cluster.name, ClusterVizService.subsampling_options(cluster)] }
    ]
    clusters_with_ids = study.cluster_groups.pluck(:id, :name).map{|c| { id: c[0].to_s, name: c[1]} }
    # clusters_with_ids = raw_clusters_with_ids
    {
      default_cluster: study.default_cluster&.name,
      default_annotation: AnnotationVizService.get_selected_annotation(study),
      annotations: AnnotationVizService.available_annotations(study, cluster: nil, current_user: user),
      clusters: study.cluster_groups.pluck(:name),
      clusters_with_ids: clusters_with_ids,
      subsample_thresholds: subsample_thresholds
    }
  end

  # convert a UserAnnotation object to a annotation of the type expected by the frontend
  def self.user_annot_to_annot(user_annotation, cluster)
    {
      name: user_annotation.name,
      id: user_annotation.id.to_s,
      type: 'group', # all user annotations are group
      values: sanitize_values_array(user_annotation.values, 'group'),
      scope: 'user',
      cluster_name: cluster.name
    }
  end

  # returns a flat array of annotation objects, with name, scope, annotation_type, and values for each
  def self.available_annotations(study, cluster: nil, current_user: nil, annotation_type: nil)
    annotations = []
    viewable = study.viewable_metadata
    metadata = annotation_type.nil? ? viewable : viewable.select {|m| m.annotation_type == annotation_type}
    metadata = metadata.map do |annot|
      {
        name: annot.name,
        type: annot.annotation_type,
        values: sanitize_values_array(annot.values, annot.annotation_type),
        scope: 'study'
      }
    end
    annotations.concat(metadata)
    cluster_annots = []
    if cluster.present?
      cluster_annots = ClusterVizService.available_annotations_by_cluster(cluster, annotation_type)
      if current_user.present?
        cluster_annots.concat(UserAnnotation.viewable_by_cluster(current_user, cluster)
                                            .map{ |ua| AnnotationVizService.user_annot_to_annot(ua, cluster) })
      end
    else
      study.cluster_groups.each do |cluster_group|
        cluster_annots.concat(ClusterVizService.available_annotations_by_cluster(cluster_group, annotation_type))
        if current_user.present?
          cluster_annots.concat(UserAnnotation.viewable_by_cluster(current_user, cluster_group)
                                              .map{ |ua| AnnotationVizService.user_annot_to_annot(ua, cluster_group) })
        end
      end
    end
    annotations.concat(cluster_annots)
    # show 'invalid' annotations (e.g. cannot be visualized) as a courtesy, but don't allow selection
    invalid_annots = []
    study.cell_metadata.each do |meta|
      unless meta.can_visualize?
        invalid_annots << {
          name: meta.name,
          type: meta.annotation_type,
          values: meta.values,
          scope: 'invalid'
        }
      end
    end
    if cluster.present?
      cluster.cell_annotations.each do |cell_annot|
        unless cluster.can_visualize_cell_annotation?(cell_annot)
          invalid_annots << {
            name: cell_annot['name'],
            type: cell_annot['annotation_type'],
            values: cell_annot['values'],
            scope: 'invalid'
          }
        end
      end
    end
    annotations.concat(invalid_annots)
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
        annotation_value = study_annotations[cell]
        annotations << annotation_value
      end
    end
    # sanitize annotation values
    sanitized_annotations = AnnotationVizService.sanitize_values_array(annotations, annotation[:type])
    # assemble rows of data
    rows = []
    cells.each_with_index do |cell, index|
      rows << [cell, sanitized_annotations[index]].join("\t")
    end
    headers = ['NAME', annotation[:name]]
    [headers.join("\t"), rows.join("\n")].join("\n")
  end

  # sanitizes an array of values to replace blank/missing values with a pre-defined label
  # prevents breaking various kinds of visualization due to values not being defined
  #
  # * *params*
  #   - +value+ (Array) => values array to sanitize
  #   - +annotation_type+ (String) => type of array, either "group" or "numeric"
  #
  # * *returns*
  #   - (Array) => sanitized output array if "group", otherwise input array
  def self.sanitize_values_array(values, annotation_type)
    return values if annotation_type == 'numeric'
    values.map {|value| value.blank? ? MISSING_VALUE_LABEL : value }
  end
end
