class ExpressionRenderingService
  def self.get_global_expression_render_data(study,
                                             subsample,
                                             gene,
                                             cluster,
                                             selected_annotation,
                                             boxpoints,
                                             current_user)
    render_data = {}

    render_data[:y_axis_title] = load_expression_axis_title(study)
    if selected_annotation[:type] == 'group'
      render_data[:values] = load_expression_boxplot_data_array_scores(study, gene, cluster, selected_annotation, subsample)
      render_data[:values_jitter] = boxpoints
    else
      render_data[:values] = load_annotation_based_data_array_scatter(study, gene, cluster, selected_annotation, subsample, render_data[:y_axis_title])
    end
    render_data[:options] = load_cluster_group_options(study)
    render_data[:cluster_annotations] = load_cluster_group_annotations(study, cluster, current_user)
    render_data[:subsampling_options] = subsampling_options(cluster)

    render_data[:rendered_cluster] = cluster.name
    render_data[:rendered_annotation] = "#{selected_annotation[:name]}--#{selected_annotation[:type]}--#{selected_annotation[:scope]}"
    render_data[:rendered_subsample] = subsample
    render_data
  end


  def self.load_expression_axis_title(study)
    study.default_expression_label
  end

  # helper method to load all possible cluster groups for a study
  def self.load_cluster_group_options(study)
    study.cluster_groups.map(&:name)
  end

  # helper method to load all available cluster_group-specific annotations
  def self.load_cluster_group_annotations(study, cluster, current_user)
    grouped_options = study.formatted_annotation_select(cluster: cluster)
    # load available user annotations (if any)
    if current_user.present?
      user_annotations = UserAnnotation.viewable_by_cluster(current_user, cluster)
      unless user_annotations.empty?
        grouped_options['User Annotations'] = user_annotations.map {|annot| ["#{annot.name}", "#{annot.id}--group--user"] }
      end
    end
    grouped_options
  end

  # load box plot scores from gene expression values using data array of cell names for given cluster
  def self.load_expression_boxplot_data_array_scores(study, gene, cluster, annotation, subsample_threshold=nil)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    values = initialize_plotly_objects_by_annotation(annotation)

    # based on scope of annotation, load requested cell names & annotations, then construct a Hash to contain
    # the mapping of cells to annotation values
    case annotation[:scope]
    when 'user'
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotations = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotation_hash = Hash[cells.zip(annotations)]
    when 'cluster'
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotations = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      annotation_hash = Hash[cells.zip(annotations)]
    else
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotation_hash =  study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type]).cell_annotations
    end
    # now filter cells to only include those sampled for the requested gene
    filtered_cells = filter_cells_by_gene_requested(cluster_cells: cells, gene_name: gene['name'], study: study)

    # now using filtered cells, construct object for visualization
    filtered_cells.each do |cell|
      val = annotation_hash[cell]
      # must check if key exists
      if values.has_key?(val)
        values[annotations[cell]][:y] << gene['scores'][cell].to_f.round(4)
        values[annotations[cell]][:cells] << cell
      end
    end
    # remove any empty values as annotations may have created keys that don't exist in cluster
    values.delete_if {|key, data| data[:y].empty?}
    values
  end

  # method to load a 2-d scatter of selected numeric annotation vs. gene expression
  def self.load_annotation_based_data_array_scatter(study, gene, cluster, annotation, subsample_threshold, y_axis_title)

    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"

    # based on scope of annotation, load requested cell names & annotations, then construct a Hash to contain
    # the mapping of cells to annotation values
    case annotation[:scope]
    when 'user'
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotations = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotation_hash = Hash[cells.zip(annotations)]
    when 'cluster'
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotations = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      annotation_hash = Hash[cells.zip(annotations)]
    else
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      annotation_hash =  study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type]).cell_annotations
    end
    # now filter cells to only include those sampled for the requested gene
    filtered_cells = filter_cells_by_gene_requested(cluster_cells: cells, gene_name: gene['name'], study: study)

    values = {all:
                  {x: [], y: [], cells: [], annotations: [], text: [],
                   marker: {
                       size: study.default_cluster_point_size,
                       line: { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0}
                   }
                  }
    }
    filtered_cells.each do |cell|
      if annotation_hash.has_key?(cell)
        annotation_value = annotation_hash[cell]
        expression_value = gene['scores'][cell].to_f.round(4)
        values[:all][:text] << "<b>#{cell}</b><br>#{annotation_value}<br>#{y_axis_title}: #{expression_value}"
        values[:all][:annotations] << annotation_value
        values[:all][:x] << annotation_value
        values[:all][:y] << expression_value
        values[:all][:cells] << cell
      end
    end
    values
  end

  # method to initialize containers for plotly by annotation values
  def self.initialize_plotly_objects_by_annotation(annotation)
    values = {}
    annotation[:values].each do |value|
      values["#{value}"] = {y: [], cells: [], annotations: [], name: "#{value}" }
    end
    values
  end

  # return an array of values to use for subsampling dropdown scaled to number of cells in study
  # only options allowed are 1000, 10000, 20000, and 100000
  # will only provide options if subsampling has completed for a cluster
  def self.subsampling_options(cluster)
    if cluster.is_subsampling?
      []
    else
      ClusterGroup::SUBSAMPLE_THRESHOLDS.select {|sample| sample < cluster.points}
    end
  end

  # filter down expression-based visualizations by finding the intersection of cells from the requested
  # cluster/annotation and the cells sampled for the requested gene/matrices from a study
  def self.filter_cells_by_gene_requested(cluster_cells:, gene_name:, study:)
    sampled_matrix_cells = Gene.all_cells_observed_by_gene(study_id: study.id, expr_matrix_ids: study.expression_matrix_file_ids,
                                                           gene_name: gene_name)
    cluster_cells & sampled_matrix_cells
  end
end
