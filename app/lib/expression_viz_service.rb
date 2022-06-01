class ExpressionVizService
  def self.get_global_expression_render_data(study:,
                                             subsample:,
                                             genes:,
                                             cluster:,
                                             selected_annotation:,
                                             boxpoints:,
                                             consensus:,
                                             current_user:)
    render_data = {}
    return render_data if cluster.nil?

    render_data[:y_axis_title] = load_expression_axis_title(study)

    if selected_annotation[:type] == 'group'
      if genes.count == 1
        render_data[:values] = load_expression_boxplot_data_array_scores(study, genes[0], cluster, selected_annotation, subsample)
      else
        render_data[:values] = load_gene_set_expression_boxplot_scores(study, genes, cluster, selected_annotation, consensus, subsample)
      end

      render_data[:values_jitter] = boxpoints
    else
      render_data[:values] = load_annotation_based_data_array_scatter(study, genes[0], cluster, selected_annotation, subsample)
    end
    render_data[:gene_names] = genes.map{ |g| g['name'] }
    render_data[:annotation_list] = AnnotationVizService.get_study_annotation_options(study, current_user)
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
    return values if cluster.nil?

    # grab all cells present in the cluster, and use as keys to load expression scores
    # if a cell is not present for the gene, score gets set as 0.0
    if annotation[:scope] == 'user'
      user_annotation = UserAnnotation.find(annotation[:id])
      return values if user_annotation.nil?

      cells = user_annotation.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    end
    # filter list of cells down to only those observed in expression matrix
    filtered_cells = filter_cells_for_plot(study, cells)
    annotations = AnnotationVizService.get_annotation_as_hash(study, cluster, annotation, subsample_threshold)

    # use filtered cells & annotations hash to populate expression data plot
    filtered_cells.each do |cell|
      val = annotations[cell]
      # must check if key exists
      if values.has_key?(val)
        values[annotations[cell]][:y] << gene['scores'][cell].to_f.round(4)
        values[annotations[cell]][:cells] << cell
      end
    end
    # remove any empty values as annotations may have created keys that don't exist in cluster
    values.delete_if { |_, data| data[:y].empty? }
    values
  end

  # method to load a 2-d scatter of selected numeric annotation vs. gene expression
  def self.load_annotation_based_data_array_scatter(study, gene, cluster, annotation, subsample_threshold)
    return {} if cluster.nil? || gene.empty?

    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = ClusterVizService.get_annotation_values_array(
      study, cluster, annotation, cells, subsample_annotation, subsample_threshold
    )

    {
      x: annotation_array,
      y: cells.map { |cell| gene['scores'][cell].to_f.round(4) },
      cells: cells,
      annotations: annotation_array
    }
  end

  # load cluster_group data_array values, but use expression scores to set numerical color array
  # this is the scatter plot shown in the "scatter" tab next to "distribution" on gene-based views
  def self.load_expression_data_array_points(study, genes, cluster, annotation, subsample=nil,
    consensus: nil, include_coords: true, include_annotation: true, include_cells: true)
    return {} if cluster.nil? || genes.empty?

    viz_data = ClusterVizService.load_cluster_group_data_array_points(study, cluster, annotation, subsample,
      include_annotations: include_annotation, include_coords: include_coords)

    filtered_cells = filter_cells_for_plot(study, viz_data[:cells])

    viz_data[:expression] = viz_data[:cells].map do |cell|
      if !filtered_cells.include?(cell)
        expression_score = nil
      elsif consensus == 'median'
        expression_score = calculate_median(genes, cell)
      elsif consensus == 'mean'
        expression_score = calculate_mean(genes, cell)
      else
        expression_score = genes[0]['scores'][cell].to_f.round(4)
      end
      expression_score
    end

    if !include_coords
      # x and y will already be excluded, but we had to return the cells from the above call to
      # match the appropriate gene scores
      viz_data.delete(:cells)
    end
    viz_data
  end

  def self.load_correlated_data_array_scatter(study, genes, cluster, annotation,  subsample_threshold=nil)
    return {} if cluster.nil? || genes.empty?

    viz_data = ClusterVizService.load_cluster_group_data_array_points(study, cluster, annotation, subsample_threshold=nil, include_coords: false)

    gene0_expression = viz_data[:cells].map { |cell| genes[0]['scores'][cell].to_f.round(4) }
    gene1_expression = viz_data[:cells].map { |cell| genes[1]['scores'][cell].to_f.round(4) }

    viz_data[:x] = gene0_expression
    viz_data[:y] = gene1_expression
    viz_data
  end

  # load boxplot expression scores vs. scores across each gene for all cells
  # will support a variety of consensus modes (default is mean)
  def self.load_gene_set_expression_boxplot_scores(study, genes, cluster, annotation, consensus, subsample_threshold=nil)
    values = initialize_plotly_objects_by_annotation(annotation)
    return values if cluster.nil? || genes.empty?

    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    # grab all cells present in the cluster, and use as keys to load expression scores
    # if a cell is not present for the gene, score gets set as 0.0 unless not observed in expression matrix
    # will check if there are more than SUBSAMPLE_THRESHOLD cells present in the cluster, and subsample accordingly
    # values hash will be assembled differently depending on annotation scope (cluster-based is array, study-based is a hash)
    if annotation[:scope] == 'user'
      user_annotation = UserAnnotation.find(annotation[:id])
      return values if user_annotation.nil?

      cells = user_annotation.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    else
      cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    end
    # filter list of cells down to only those observed in expression matrix
    filtered_cells = filter_cells_for_plot(study, cells)
    annotations = AnnotationVizService.get_annotation_as_hash(study, cluster, annotation, subsample_threshold)
    filtered_cells.each do |cell|
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

    # remove any empty values as annotations may have created keys that don't exist in cluster
    values.delete_if { |_, data| data[:y].empty? }
    values
  end

  # method to load a 2-d scatter of selected numeric annotation vs. gene set expression
  # will support a variety of consensus modes (default is mean)
  def self.load_gene_set_annotation_based_scatter(study, genes, cluster, annotation, consensus, subsample_threshold=nil)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    viz_data = {
      x: [],
      y: [],
      cells: [],
      annotations: []
    }
    return viz_data if cluster.nil? || genes.empty?

    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = ClusterVizService.get_annotation_values_array(
      study, cluster, annotation, cells, subsample_annotation, subsample_threshold
    )

    cells.each_with_index do |cell, index|
      annotation_value = annotation_array[index]
      if !annotation_value.nil?
        case consensus
        when 'mean'
          expression_value = calculate_mean(genes, cell)
        when 'median'
          expression_value = calculate_median(genes, cell)
        else
          expression_value = calculate_mean(genes, cell)
        end
        viz_data[:annotations] << annotation_value
        viz_data[:x] << annotation_value
        viz_data[:y] << expression_value
        viz_data[:cells] << cell
      end
    end
    viz_data
  end

  # filter list of cells to only include those observed in the expression matrices for the requested study to
  # avoid over-inflation of 0 values due to nil.to_f => 0.0
  def self.filter_cells_for_plot(study, cluster_cells)
    cluster_cells & study.processed_matrix_cells
  end

  # method to initialize containers for plotly by annotation values
  def self.initialize_plotly_objects_by_annotation(annotation)
    values = {}
    annotation[:values].each do |value|
      values["#{value}"] = {y: [], cells: [], annotations: [], name: "#{value}" }
    end
    values
  end

  # helper method for parsing the legacy [name]--[type]--[scope] string format into an object
  # finds the string from either params[:gene_set_annotation] or params[:annotation]
  def self.parse_annotation_legacy_params(study, params)
    selector = params[:annotation].nil? ? params[:gene_set_annotation] : params[:annotation]
    annot_name, annot_type, annot_scope = selector.nil? ? study.default_annotation.split('--') : selector.split('--')
    {
      name: annot_name,
      type: annot_type,
      scope: annot_scope
    }
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

  # return a text file for morpheus to use when rendering dotplots/heatmaps
  # supports both expression data (gct format) and annotation data
  def self.get_morpheus_text_data(study: nil,
                                  file_type: nil,
                                  genes: nil,
                                  cluster: nil,
                                  collapse_by: nil,
                                  selected_annotation: nil)
    return '' if cluster.nil?

    cells = cluster.concatenate_data_arrays('text', 'cells')
    filtered_cells = filter_cells_for_plot(study, cells)
    row_data = []
    case file_type
    when :gct
      headers = %w(Name Description)
      cols = filtered_cells.size
      filtered_cells.each do |cell|
        headers << cell
      end
      rows = []
      genes.each do |gene|
        row = [gene['name'], ""]
        case collapse_by
        when 'z-score'
          vals = Gene.z_score(gene['scores'], filtered_cells)
          row += vals
        when 'robust-z-score'
          vals = Gene.robust_z_score(gene['scores'], filtered_cells)
          row += vals
        else
          filtered_cells.each do |cell|
            row << gene['scores'][cell].to_f
          end
        end
        rows << row.join("\t")
      end
      row_data = ['#1.2', [rows.size, cols].join("\t"), headers.join("\t"), rows.join("\n")]
    when :annotation
      headers = ['NAME', selected_annotation[:name]]
      if selected_annotation[:scope] == 'cluster'
        annotations = cluster.concatenate_data_arrays(selected_annotation[:name], 'annotations')
      else
        study_annotations = study.cell_metadata_values(selected_annotation[:name], selected_annotation[:type])
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

      row_data = [headers.join("\t"), rows.join("\n")]
    end
    row_data.join("\n")
  end
end
