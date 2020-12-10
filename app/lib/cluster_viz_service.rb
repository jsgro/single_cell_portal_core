class ClusterVizService
  # set of utility methods used for visualizing cluster data

  def self.get_cluster_group(study, params)
    # determine which URL param to use for selection
    selector = params[:cluster].nil? ? params[:gene_set_cluster] : params[:cluster]
    if selector.nil? || selector.empty?
      study.default_cluster
    else
      study.cluster_groups.by_name(selector)
    end
  end

  # helper method to load all possible cluster groups for a study
  def self.load_cluster_group_options(study)
    non_spatial_file_ids = StudyFile.where(study: study, :is_spatial.ne => true, file_type: 'Cluster').pluck(:id)
    ClusterGroup.where(study: study, :study_file_id.in => non_spatial_file_ids).pluck(:name)
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


  def self.available_annotations_by_cluster(cluster, annotation_type=nil)
    cluster.cell_annotations_by_type(annotation_type).map do |annot|
      {
        name: annot[:name],
        type: annot[:type],
        values: annot[:values],
        scope: 'cluster',
        cluster_name: cluster.name
      }
    end
  end

  # helper method to load spatial coordinate group names
  def self.load_spatial_options(study)
    spatial_file_ids = StudyFile.where(study: study, is_spatial: true, file_type: 'Cluster').pluck(:id)
    ClusterGroup.where(study: study, :study_file_id.in => spatial_file_ids).pluck(:name)
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

  # Convert cluster group data array points into JSON plot data for Plotly
  def self.transform_coordinates(coordinates, study, cluster_group, selected_annotation)
    plot_data = []
    plot_type = cluster_group.is_3d? ? 'scatter3d' : 'scattergl'
    coordinates.sort_by {|k,v| k}.each_with_index do |(cluster, data), index|
      cluster_props = {
        x: data[:x],
        y: data[:y],
        cells: data[:cells],
        text: data[:text],
        name: data[:name],
        type: plot_type,
        mode: 'markers',
        marker: data[:marker],
        opacity: study.default_cluster_point_alpha,
      }

      if !data[:annotations].nil?
        cluster_props[:annotations] = data[:annotations]
      end

      if cluster_group.is_3d?
        cluster_props[:z] = data[:z]
        cluster_props[:textposition] = 'bottom right'
      end

      plot_data.push(cluster_props)
    end

    plot_data
  end

    # load custom coordinate-based annotation labels for a given cluster
  def self.load_cluster_group_coordinate_labels(cluster)
    # assemble source data
    x_array = cluster.concatenate_data_arrays('x', 'labels')
    y_array = cluster.concatenate_data_arrays('y', 'labels')
    z_array = cluster.concatenate_data_arrays('z', 'labels')
    text_array = cluster.concatenate_data_arrays('text', 'labels')
    annotations = []
    # iterate through list of data objects to construct necessary annotations
    x_array.each_with_index do |point, index|
      annot = {
        showarrow: false,
        x: point,
        y: y_array[index],

        text: text_array[index],
        font: {
          family: cluster.coordinate_labels_options[:font_family],
          size: cluster.coordinate_labels_options[:font_size],
          color: cluster.coordinate_labels_options[:font_color]
        }
      }
      if cluster.is_3d?
        annot[:z] = z_array[index]
      end
      annotations << annot
    end
    annotations
  end

  # retrieve axis labels from cluster coordinates file (if provided)
  def self.load_axis_labels(cluster)
    coordinates_file = cluster.study_file
    {
        x: coordinates_file.x_axis_label.blank? ? 'X' : coordinates_file.x_axis_label,
        y: coordinates_file.y_axis_label.blank? ? 'Y' : coordinates_file.y_axis_label,
        z: coordinates_file.z_axis_label.blank? ? 'Z' : coordinates_file.z_axis_label
    }
  end

  # compute the aspect ratio between all ranges and use to enforce equal-aspect ranges on 3d plots
  def self.compute_aspect_ratios(range)
    # determine largest range for computing aspect ratio
    extent = {}
    range.each.map {|axis, domain| extent[axis] = domain.first.upto(domain.last).size - 1}
    largest_range = extent.values.max

    # now compute aspect mode and ratios
    aspect = {
        mode: extent.values.uniq.size == 1 ? 'cube' : 'manual'
    }
    range.each_key do |axis|
      aspect[axis.to_sym] = extent[axis].to_f / largest_range
    end
    aspect
  end

  # set the range for a plotly scatter, will default to data-defined if cluster hasn't defined its own ranges
  # dynamically determines range based on inputs & available axes
  def self.set_range(cluster, inputs)
    # select coordinate axes from inputs
    domain_keys = inputs.map(&:keys).flatten.uniq.select {|i| [:x, :y, :z].include?(i)}
    range = Hash[domain_keys.zip]
    if cluster.has_range?
      # use study-provided range if available
      range = cluster.domain_ranges
    else
      # take the minmax of each domain across all groups, then the global minmax
      raw_values = []
      inputs.each do |input|
        domain_keys.each do |domain|
          domain_range = RequestUtils.get_minmax(input[domain])
          # RequestUtils.get_minmax will discard NaN/nil values that were ingested
          # only add domain range to list if we have a valid minmax
          raw_values << domain_range if domain_range.any?
        end
      end
      aggregate_range = raw_values.flatten.minmax
      # add 2% padding to range
      padding = (aggregate_range.first - aggregate_range.last) * 0.02
      absolute_range = [aggregate_range.first + padding, aggregate_range.last - padding]
      range[:x] = absolute_range
      range[:y] = absolute_range
      range[:z] = absolute_range
    end
    range
  end

  # generic method to populate data structure to render a cluster scatter plot
  # uses cluster_group model and loads annotation for both group & numeric plots
  # data values are pulled from associated data_array entries for each axis and annotation/text value
  def self.load_cluster_group_data_array_points(study, cluster, annotation, subsample_threshold=nil, colorscale=nil)
    # construct annotation key to load subsample data_arrays if needed, will be identical to params[:annotation]
    subsample_annotation = "#{annotation[:name]}--#{annotation[:type]}--#{annotation[:scope]}"
    x_array = cluster.concatenate_data_arrays('x', 'coordinates', subsample_threshold, subsample_annotation)
    y_array = cluster.concatenate_data_arrays('y', 'coordinates', subsample_threshold, subsample_annotation)
    z_array = cluster.concatenate_data_arrays('z', 'coordinates', subsample_threshold, subsample_annotation)
    cells = cluster.concatenate_data_arrays('text', 'cells', subsample_threshold, subsample_annotation)
    annotation_array = []
    annotation_hash = {}
    # Construct the arrays based on scope
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
      # for study-wide annotations, load from study_metadata values instead of cluster-specific annotations
      metadata_obj = study.cell_metadata.by_name_and_type(annotation[:name], annotation[:type])
      annotation_hash = metadata_obj.cell_annotations
      annotation[:values] = annotation_hash.values
    end
    coordinates = {}
    if annotation[:type] == 'numeric'
      text_array = []
      color_array = []
      # load text & color value from correct object depending on annotation scope
      cells.each_with_index do |cell, index|
        if annotation[:scope] == 'cluster'
          val = annotation_array[index]
          text_array << "#{cell}: (#{val})"
        else
          val = annotation_hash[cell]
          text_array <<  "#{cell}: (#{val})"
          color_array << val
        end
      end
      # if we didn't assign anything to the color array, we know the annotation_array is good to use
      color_array.empty? ? color_array = annotation_array : nil
      # account for NaN when computing min/max
      min, max = RequestUtils.get_minmax(annotation_array)
      coordinates[:all] = {
          x: x_array,
          y: y_array,
          annotations: annotation[:scope] == 'cluster' ? annotation_array : annotation_hash[:values],
          text: text_array,
          cells: cells,
          name: annotation[:name],
          marker: {
              cmax: max,
              cmin: min,
              color: color_array,
              size: study.default_cluster_point_size,
              line: { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0},
              colorscale: colorscale.nil? ? 'Reds' : colorscale,
              showscale: true,
              colorbar: {
                  title: annotation[:name] ,
                  titleside: 'right'
              }
          }
      }
      if cluster.is_3d?
        coordinates[:all][:z] = z_array
      end
    else
      # assemble containers for each trace
      annotation[:values].each do |value|
        coordinates[value] = {x: [], y: [], text: [], cells: [], annotations: [], name: value,
                              marker: {size: study.default_cluster_point_size, line: { color: 'rgb(40,40,40)', width: study.show_cluster_point_borders? ? 0.5 : 0}}}
        if cluster.is_3d?
          coordinates[value][:z] = []
        end
      end

      if annotation[:scope] == 'cluster' || annotation[:scope] == 'user'
        annotation_array.each_with_index do |annotation_value, index|
          coordinates[annotation_value][:text] << "<b>#{cells[index]}</b><br>#{annotation_value}"
          coordinates[annotation_value][:annotations] << annotation_value
          coordinates[annotation_value][:cells] << cells[index]
          coordinates[annotation_value][:x] << x_array[index]
          coordinates[annotation_value][:y] << y_array[index]
          if cluster.is_3d?
            coordinates[annotation_value][:z] << z_array[index]
          end
        end
        coordinates.each do |key, data|
          data[:name] << " (#{data[:x].size} points)"
        end
      else
        cells.each_with_index do |cell, index|
          if annotation_hash.has_key?(cell)
            annotation_value = annotation_hash[cell]
            coordinates[annotation_value][:text] << "<b>#{cell}</b><br>#{annotation_value}"
            coordinates[annotation_value][:annotations] << annotation_value
            coordinates[annotation_value][:x] << x_array[index]
            coordinates[annotation_value][:y] << y_array[index]
            coordinates[annotation_value][:cells] << cell
            if cluster.is_3d?
              coordinates[annotation_value][:z] << z_array[index]
            end
          end
        end
        coordinates.each do |key, data|
          data[:name] << " (#{data[:x].size} points)"
        end

      end

    end
    # gotcha to remove entries in case a particular annotation value comes up blank since this is study-wide
    coordinates.delete_if {|key, data| data[:x].empty?}
    coordinates
  end
end
