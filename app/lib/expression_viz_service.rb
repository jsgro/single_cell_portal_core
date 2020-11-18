class ExpressionVizService
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
    render_data[:options] = ClusterVizService.load_cluster_group_options(study)
    render_data[:sptial_options] = load_spatial_options(study)
    render_data[:cluster_annotations] = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
    render_data[:subsampling_options] = subsampling_options(cluster)

    render_data[:rendered_cluster] = cluster.name
    render_data[:rendered_annotation] = "#{selected_annotation[:name]}--#{selected_annotation[:type]}--#{selected_annotation[:scope]}"
    render_data[:rendered_subsample] = subsample
    render_data
  end


  # Get a hash of inferCNV ideogram file objects, keyed by file ID
  def self.get_infercnv_ideogram_files(study)
    ideogram_files = nil

    # only populate if study has ideogram results & is not 'detached'
    if study.has_analysis_outputs?('infercnv', 'ideogram.js') && !study.detached?
      ideogram_files = {}
      study.get_analysis_outputs('infercnv', 'ideogram.js').each do |file|
        opts = file.options.with_indifferent_access # allow lookup by string or symbol
        cluster_name = opts[:cluster_name]
        annotation_name = opts[:annotation_name].split('--').first
        ideogram_file_object = {
          cluster: cluster_name,
          annotation: opts[:annotation_name],
          display: "#{cluster_name}: #{annotation_name}",
          ideogram_settings: study.get_ideogram_infercnv_settings(cluster_name, opts[:annotation_name])
        }
        ideogram_files[file.id.to_s] = ideogram_file_object
      end
    end

    return ideogram_files
  end

  def self.load_expression_axis_title(study)
    study.default_expression_label
  end

  # load box plot scores from gene expression values using data array of cell names for given cluster
  def self.load_expression_boxplot_data_array_scores(study, gene, cluster, annotation, subsample_threshold=nil)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    values = initialize_plotly_objects_by_annotation(annotation)

    # grab all cells present in the cluster, and use as keys to load expression scores
    # if a cell is not present for the gene, score gets set as 0.0
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    if annotation[:scope] == 'cluster'
      # we can take a subsample of the same size for the annotations since the sort order is non-stochastic (i.e. the indices chosen are the same every time for all arrays)
      annotations = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells.each_with_index do |cell, index|
        values[annotations[index]][:y] << gene['scores'][cell].to_f.round(4)
      end
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotations = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      cells.each_with_index do |cell, index|
        values[annotations[index]][:y] << gene['scores'][cell].to_f.round(4)
      end
    else
      # since annotations are in a hash format, subsampling isn't necessary as we're going to retrieve values by key lookup
      annotations =  study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type]).cell_annotations
      cells.each do |cell|
        val = annotations[cell]
        # must check if key exists
        if values.has_key?(val)
          values[annotations[cell]][:y] << gene['scores'][cell].to_f.round(4)
          values[annotations[cell]][:cells] << cell
        end
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
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = []
    annotation_hash = {}
    if annotation[:scope] == 'cluster'
      annotation_array = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotation_array = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      # for study-wide annotations, load from study_metadata values instead of cluster-specific annotations
      metadata_obj = study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type])
      annotation_hash = metadata_obj.cell_annotations
    end
    values = {}
    values[:all] = {x: [], y: [], cells: [], annotations: [], text: [], marker: {size: study.default_cluster_point_size,
                                                                                 line: { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0}}}
    if annotation[:scope] == 'cluster' || annotation[:scope] == 'user'
      annotation_array.each_with_index do |annot, index|
        annotation_value = annot
        cell_name = cells[index]
        expression_value = gene['scores'][cell_name].to_f.round(4)

        values[:all][:text] << "<b>#{cell_name}</b><br>#{annotation_value}<br>#{y_axis_title}: #{expression_value}"
        values[:all][:annotations] << annotation_value
        values[:all][:x] << annotation_value
        values[:all][:y] << expression_value
        values[:all][:cells] << cell_name
      end
    else
      cells.each do |cell|
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
    end
    values
  end

  # load cluster_group data_array values, but use expression scores to set numerical color array
  # this is the scatter plot shown in the "scatter" tab next to "distribution" on gene-based views
  def self.load_expression_data_array_points(study, gene, cluster, annotation, subsample_threshold=nil, y_axis_title, colorscale)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    x_array = cluster.concatenate_data_arrays('x', 'coordinates', subsample_threshold, subsample_annotation)
    y_array = cluster.concatenate_data_arrays('y', 'coordinates', subsample_threshold, subsample_annotation)
    z_array = cluster.concatenate_data_arrays('z', 'coordinates', subsample_threshold, subsample_annotation)
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = []
    annotation_hash = {}
    if annotation[:scope] == 'cluster'
      annotation_array = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotation_array = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      x_array = user_annotation.concatenate_user_data_arrays('x', 'coordinates', subsample_threshold, subsample_annotation)
      y_array = user_annotation.concatenate_user_data_arrays('y', 'coordinates', subsample_threshold, subsample_annotation)
      z_array = user_annotation.concatenate_user_data_arrays('z', 'coordinates', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      # for study-wide annotations, load from cell_metadata values instead of cluster-specific annotations
      metadata_obj = study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type])
      annotation_hash = metadata_obj.cell_annotations
    end
    expression = {}
    expression[:all] = {
        x: x_array,
        y: y_array,
        annotations: [],
        text: [],
        cells: cells,
        marker: {cmax: 0, cmin: 0, color: [], size: study.default_cluster_point_size, showscale: true, colorbar: {title: y_axis_title , titleside: 'right'}}
    }
    if cluster.is_3d?
      expression[:all][:z] = z_array
    end
    cells.each_with_index do |cell, index|
      expression_score = gene['scores'][cell].to_f.round(4)
      # load correct annotation value based on scope
      annotation_value = annotation[:scope] == 'cluster' ? annotation_array[index] : annotation_hash[cell]
      text_value = "#{cell} (#{annotation_value})<br />#{y_axis_title}: #{expression_score}"
      expression[:all][:annotations] << annotation_value
      expression[:all][:text] << text_value
      expression[:all][:marker][:color] << expression_score
    end
    expression[:all][:marker][:line] = { color: 'rgb(255,255,255)', width: study.show_cluster_point_borders? ? 0.5 : 0}
    expression[:all][:marker][:cmin], expression[:all][:marker][:cmax] = RequestUtils.get_minmax(expression[:all][:marker][:color])
    expression[:all][:marker][:colorscale] = colorscale.blank? ? 'Reds' : colorscale
    expression
  end

  # load boxplot expression scores vs. scores across each gene for all cells
  # will support a variety of consensus modes (default is mean)
  def self.load_gene_set_expression_boxplot_scores(study, genes, cluster, annotation, consensus, subsample_threshold=nil)
    values = initialize_plotly_objects_by_annotation(annotation)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    # grab all cells present in the cluster, and use as keys to load expression scores
    # if a cell is not present for the gene, score gets set as 0.0
    # will check if there are more than SUBSAMPLE_THRESHOLD cells present in the cluster, and subsample accordingly
    # values hash will be assembled differently depending on annotation scope (cluster-based is array, study-based is a hash)
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    if annotation[:scope] == 'cluster'
      annotations = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells.each_with_index do |cell, index|
        values[annotations[index]][:annotations] << annotations[index]
        case consensus
        when 'mean'
          values[annotations[index]][:y] << calculate_mean(genes, cell)
        when 'median'
          values[annotations[index]][:y] << calculate_median(genes, cell)
        else
          values[annotations[index]][:y] << calculate_mean(genes, cell)
        end
      end
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotations = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
      cells.each_with_index do |cell, index|
        values[annotations[index]][:annotations] << annotations[index]
        case consensus
        when 'mean'
          values[annotations[index]][:y] << calculate_mean(genes, cell)
        when 'median'
          values[annotations[index]][:y] << calculate_median(genes, cell)
        else
          values[annotations[index]][:y] << calculate_mean(genes, cell)
        end
      end
    else
      # no need to subsample annotation since they are in hash format (lookup done by key)
      annotations =  study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type]).cell_annotations
      cells.each do |cell|
        val = annotations[cell]
        # must check if key exists
        if values.has_key?(val)
          values[annotations[cell]][:cells] << cell
          case consensus
          when 'mean'
            values[annotations[cell]][:y] << calculate_mean(genes, cell)
          when 'median'
            values[annotations[cell]][:y] << calculate_median(genes, cell)
          else
            values[annotations[cell]][:y] << calculate_mean(genes, cell)
          end
        end
      end
    end
    # remove any empty values as annotations may have created keys that don't exist in cluster
    values.delete_if {|key, data| data[:y].empty?}
    values
  end

  # method to load a 2-d scatter of selected numeric annotation vs. gene set expression
  # will support a variety of consensus modes (default is mean)
  def self.load_gene_set_annotation_based_scatter(study, genes, cluster, annotation, consensus, subsample_threshold=nil, y_axis_title)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    values = {}
    values[:all] = {
        x: [], y: [], cells: [], annotations: [], text: [], marker: {
            size: study.default_cluster_point_size,
            line: { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0}
        }
    }
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = []
    annotation_hash = {}
    if annotation[:scope] == 'cluster'
      annotation_array = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotation_array = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      metadata_obj = study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type])
      annotation_hash = metadata_obj.cell_annotations
    end
    cells.each_with_index do |cell, index|
      annotation_value = annotation[:scope] == 'cluster' ? annotation_array[index] : annotation_hash[cell]
      if !annotation_value.nil?
        case consensus
        when 'mean'
          expression_value = calculate_mean(genes, cell)
        when 'median'
          expression_value = calculate_median(genes, cell)
        else
          expression_value = calculate_mean(genes, cell)
        end
        values[:all][:text] << "<b>#{cell}</b><br>#{annotation_value}<br>#{y_axis_title}: #{expression_value}"
        values[:all][:annotations] << annotation_value
        values[:all][:x] << annotation_value
        values[:all][:y] << expression_value
        values[:all][:cells] << cell
      end
    end
    values
  end

  # load scatter expression scores with average of scores across each gene for all cells
  # uses data_array as source for each axis
  # will support a variety of consensus modes (default is mean)
  def self.load_gene_set_expression_data_arrays(study, genes, cluster, annotation, consensus, subsample_threshold=nil, y_axis_title, colorscale)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"

    x_array = cluster.concatenate_data_arrays('x', 'coordinates', subsample_threshold, subsample_annotation)
    y_array = cluster.concatenate_data_arrays('y', 'coordinates', subsample_threshold, subsample_annotation)
    z_array = cluster.concatenate_data_arrays('z', 'coordinates', subsample_threshold, subsample_annotation)
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = []
    annotation_hash = {}
    if annotation[:scope] == 'cluster'
      annotation_array = cluster.concatenate_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
    elsif annotation[:scope] == 'user'
      # for user annotations, we have to load by id as names may not be unique to clusters
      user_annotation = UserAnnotation.find(annotation[:id])
      subsample_annotation = user_annotation.formatted_annotation_identifier
      annotation_array = user_annotation.concatenate_user_data_arrays(annotation[:name], 'annotations', subsample_threshold, subsample_annotation)
      x_array = user_annotation.concatenate_user_data_arrays('x', 'coordinates', subsample_threshold, subsample_annotation)
      y_array = user_annotation.concatenate_user_data_arrays('y', 'coordinates', subsample_threshold, subsample_annotation)
      z_array = user_annotation.concatenate_user_data_arrays('z', 'coordinates', subsample_threshold, subsample_annotation)
      cells = user_annotation.concatenate_user_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      # for study-wide annotations, load from cell_metadata values instead of cluster-specific annotations
      metadata_obj = study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type])
      annotation_hash = metadata_obj.cell_annotations
    end
    expression = {}
    expression[:all] = {
        x: x_array,
        y: y_array,
        text: [],
        annotations: [],
        cells: cells,
        marker: {cmax: 0, cmin: 0, color: [], size: study.default_cluster_point_size, showscale: true, colorbar: {title: y_axis_title , titleside: 'right'}}
    }
    if cluster.is_3d?
      expression[:all][:z] = z_array
    end
    cells.each_with_index do |cell, index|
      case consensus
      when 'mean'
        expression_score = calculate_mean(genes, cell)
      when 'median'
        expression_score = calculate_median(genes, cell)
      else
        expression_score = calculate_mean(genes, cell)
      end

      # load correct annotation value based on scope
      annotation_value = annotation[:scope] == 'cluster' ? annotation_array[index] : annotation_hash[cell]
      text_value = "#{cell} (#{annotation_value})<br />#{y_axis_title}: #{expression_score}"
      expression[:all][:annotations] << annotation_value
      expression[:all][:text] << text_value
      expression[:all][:marker][:color] << expression_score

    end
    expression[:all][:marker][:line] = { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0}
    expression[:all][:marker][:cmin], expression[:all][:marker][:cmax] = RequestUtils.get_minmax(expression[:all][:marker][:color])
    expression[:all][:marker][:colorscale] = colorscale.blank? ? 'Reds' : colorscale
    expression
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

    # helper method for parsing the legacy [name]--[type]--[scope] string format into an object
  # finds the string from either params[:gene_set_annotation] or params[:annotation]
  def self.parse_annotation_legacy_params(study, cluster, params)
    selector = params[:annotation].nil? ? params[:gene_set_annotation] : params[:annotation]
    annot_name, annot_type, annot_scope = selector.nil? ? study.default_annotation.split('--') : selector.split('--')
    {
      name: annot_name,
      type: annot_type,
      scope: annot_scope
    }
  end

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

  # find mean of expression scores for a given cell & list of genes
  def self.calculate_mean(genes, cell)
    values = genes.map {|gene| gene['scores'][cell].to_f}
    values.mean
  end

  # find median expression score for a given cell & list of genes
  def self.calculate_median(genes, cell)
    values = genes.map {|gene| gene['scores'][cell].to_f}
    Gene.array_median(values)
  end

end
