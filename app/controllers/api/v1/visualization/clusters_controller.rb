module Api
  module V1
    module Visualization
      # API methods for visualizing cluster data
      # does NOT contain methods for editing clusters
      class ClustersController < ApiBaseController
        include Concerns::Authenticator
        include Concerns::StudyAware
        include Concerns::ApiCaching
        include Swagger::Blocks

        VALID_SCOPE_VALUES = ['study', 'cluster']
        VALID_TYPE_VALUES = ['group', 'numeric']
        VALID_CONSENSUS_VALUES = ['mean', 'median']

        before_action :set_current_api_user!
        before_action :set_study
        before_action :check_study_view_permission
        # before_action :check_api_cache!
        # after_action :write_api_cache!

        swagger_path '/studies/{accession}/clusters' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get the default cluster and its sub-clusters for a study'
            key :description, 'Get the default cluster group and its constituent cluster annotations'
            key :operationId, 'study_clusters_path'
            parameter do
              key :name, :accession
              key :in, :path
              key :description, 'Accession of study'
              key :required, true
              key :type, :string
            end
            response 200 do
              schema do
                key :type, :array
                key :description, 'Array of all cluster group names for this study'
                items do
                  key :type, :string
                  key :description, 'Name of cluster'
                end
              end
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        # return a listing of all clusters
        def index
          render json: ClusterVizService.load_cluster_group_options(@study)
        end

        swagger_path '/studies/{accession}/clusters/{cluster_name}' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get a cluster\'s visualization data for a study'
            key :description, 'Get the cluster group and its constituent cluster annotations.'
            key :operationId, 'study_cluster_path'
            parameter do
              key :name, :accession
              key :in, :path
              key :description, 'Accession of study'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :cluster_name
              key :in, :path
              key :description, 'Name of cluster group.  Use "_default" to return the default cluster'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :is_annotated_scatter
              key :in, :query
              key :description, 'Whether plot is an "Annotated Scatter", i.e. an annotation-based data array scatter plot.'
              key :type, :string
            end
            response 200 do
              key :description, 'Scatter plot visualization of cluster, suitable for rendering in Plotly'
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        def show
          Rails.logger.info "In clusters_controller.rb"
          cluster = nil
          if params[:cluster_name] == '_default' || params[:cluster_name].empty?
            cluster = @study.default_cluster
            if cluster.nil?
              render json: {error: 'No default cluster exists'}, status: 404 and return
            end
          else
            cluster_name = params[:cluster_name]
            cluster = @study.cluster_groups.find_by(name: cluster_name)
            if cluster.nil?
              render json: {error: "No cluster named #{cluster_name} could be found"}, status: 404 and return
            end
          end
          viz_data = nil
          if User.feature_flag_for_instance(current_api_user, 'mock_viz_retrieval')
            Rails.logger.info "in show for mock_viz_retrieval"
            # render plain: self.class.get_fixed_size_response(params[:subsample].to_i, current_api_user) and return
            # send_data self.class.get_fixed_size_response_binary(params[:subsample].to_i, current_api_user), :disposition => 'inline' and return
            render json: self.class.get_fixed_size_response_json(params[:subsample].to_i, current_api_user) and return
          else
            viz_data = self.class.get_cluster_viz_data(@study, cluster, params)
          end
          if viz_data.nil?
            render json: {error: 'Annotation could not be found'}, status: 404 and return
          end
          render json: viz_data
        end

        # packages up a bunch of calls to rendering service endpoints for a response object
        def self.get_cluster_viz_data(study, cluster, url_params)
          annot_params = AnnotationsController.get_annotation_params(url_params)
          annotation = AnnotationVizService.get_selected_annotation(study,
                                                       cluster: cluster,
                                                       annot_name: annot_params[:name],
                                                       annot_type: annot_params[:type],
                                                       annot_scope: annot_params[:scope])
          if !annotation
            return nil
          end

          subsample = get_selected_subsample_threshold(url_params[:subsample], cluster)
          consensus = url_params[:consensus].blank? ? nil : url_params[:consensus]



          colorscale = url_params[:colorscale].blank? ? 'Reds' : url_params[:colorscale]

          is_annotated_scatter = !url_params[:is_annotated_scatter].blank?

          titles = ClusterVizService.load_axis_labels(cluster)
          coordinates = nil
          genes = RequestUtils.get_genes_from_param(study, url_params[:gene])

          if url_params[:gene].blank?
            # For "Clusters" tab in default view of Explore tab
            coordinates = ClusterVizService.load_cluster_group_data_array_points(study, cluster, annotation, subsample, colorscale)
            if cluster.is_3d?
              range = ClusterVizService.set_range(cluster, coordinates.values)
            end
          else
            # For single-gene view of Explore tab (or collapsed multi-gene)
            is_collapsed_view = genes.length > 1 && consensus.present?
            y_axis_title = ExpressionVizService.load_expression_axis_title(study)

            if is_annotated_scatter
              # For "Annotated scatter" tab, shown in first tab for numeric annotations
              if is_collapsed_view
                coordinates = ExpressionVizService.load_gene_set_annotation_based_scatter(study, genes, cluster, annotation, consensus, subsample, y_axis_title)
              else
                coordinates = ExpressionVizService.load_annotation_based_data_array_scatter(
                  study, genes[0], cluster, annotation, subsample, y_axis_title)
              end
              range = ClusterVizService.set_range(cluster, coordinates.values)
              titles = {
                x: annot_params[:name],
                y: y_axis_title
              }
            else
              # For "Scatter" tab
              if is_collapsed_view
                coordinates = ExpressionVizService.load_gene_set_expression_data_arrays(study, genes, cluster, annotation, consensus, subsample, y_axis_title, colorscale)
              else
                coordinates = ExpressionVizService.load_expression_data_array_points(study, genes[0], cluster, annotation, subsample, y_axis_title, colorscale)
              end
            end
          end

          if cluster.is_3d? && cluster.has_range?
            aspect = ClusterVizService.compute_aspect_ratios(range)
          end

          plot_data = ClusterVizService.transform_coordinates(coordinates, study, cluster, annotation)


          axes_full = {
            titles: titles,
            ranges: range,
            aspects: aspect
          }

          coordinate_labels = ClusterVizService.load_cluster_group_coordinate_labels(cluster)
          response_obj = {
            "data": plot_data,
            "description": cluster.study_file.description,
            "is3D": cluster.is_3d?,
            "isSubsampled": cluster.subsampled?,
            "isAnnotatedScatter": is_annotated_scatter,
            "numPoints": cluster.points,
            "domainRanges": cluster.domain_ranges,
            "axes": axes_full,
            "hasCoordinateLabels": cluster.has_coordinate_labels?,
            "coordinateLabels": coordinate_labels,
            "cluster": cluster.name,
            "gene": genes.map {|g| g['name']}.join(', '),
            "annotParams": annotation,
            "subsample": subsample.nil? ? 'all' : subsample,
            "consensus": consensus
          }
          response_obj
        end

        def self.get_fixed_size_response_binary(num_cells, user)
          num_annots = 10
          num_cells = 1000000
          annot_size = num_cells / num_annots

          x = num_cells.times.map { |n| (rand * 140).round(3) }
          y = num_cells.times.map { |n| (rand * 14 + (n.to_f * 140.to_f / num_cells.to_f)).round(3)}

          # E.g.:
          # x = [1.001, 3.001, 5.001]
          # y = [2.001, 4.001, 6.001]
          data = []

          # This approach might enable streaming renders, as coordinates for each point are adjacent
          # x.each_index { |i| data.push(x[i], y[i]) } # [1, 2, 3, 4, 5, 6]

          # This approach precludes streaming render, but eases client-side reassembly
          data = x.concat(y) # [1, 3, 5, 2, 4, 6].  We'd avoid the assignment after this experiment.

          # Converts to a binary-encoded list of 32-bit floats (single-precision, native format)
          # https://apidock.com/ruby/Array/pack
          data = data.pack('f*')

          return data
        end

        def self.get_fixed_size_response_json(num_cells, user)
          num_annots = 10
          num_cells = 1000000
          annot_size = num_cells / num_annots

          x = num_cells.times.map { |n| (rand * 140).round(3) }
          y = num_cells.times.map { |n| (rand * 14 + (n.to_f * 140.to_f / num_cells.to_f)).round(3)}

          data = {
            :x=> x,
            :y => y
          }

          return data
        end

        # returns a string that can be immmediately passed to the front end for cluster visualization
        # the only parameter is the number of cells in the response
        # this method either randomly generates the data, or pulls the data from a postgres instance
        # depending on the feature flag
        def self.get_fixed_size_response(num_cells, user)
          use_postgres = true
          if User.feature_flag_for_instance(user, 'postgres_viz_backend')
            conn = PostgresConnection.get
            result = conn.exec("select json_data from cluster_data where cluster_name = 'cluster#{num_cells}';")
            return result.first['json_data']
          else
            num_annots = 10
            fake_annotations = num_annots.times.map { |n| "ant#{n}" }
            mock_response = {
              :description=>nil,
              :is3D=>false,
              :isSubsampled=>false,
              :isAnnotatedScatter=>false,
              :numPoints=>num_cells,
              :domainRanges=>nil,
              :axes=> {
                :titles=>{:x=>"X", :y=>"Y", :z=>"Z"},
                :ranges=>nil,
                :aspects=>nil
              },
              :hasCoordinateLabels=>true,
              :coordinateLabels=>[
                {:showarrow=>false, :x=>20.0, :y=>20.0, :text=>"Lower left", :font=>{:family=>"Helvetica Neue", :size=>10, :color=>"#333333"}},
                {:showarrow=>false, :x=>140.0, :y=>140.0, :text=>"Upper right", :font=>{:family=>"Helvetica Neue", :size=>10, :color=>"#333333"}},
                {:showarrow=>false, :x=>30.0, :y=>130.0, :text=>"Upper left", :font=>{:family=>"Helvetica Neue", :size=>10, :color=>"#333333"}},
                {:showarrow=>false, :x=>120.0, :y=>33.0, :text=>"Lower right", :font=>{:family=>"Helvetica Neue", :size=>10, :color=>"#333333"}}
              ],
              :cluster=>"cluster.tsv",
              :gene=>"",
              :annotParams=>{:name=>"biosample_id", :type=>"group", :scope=>"study"}
            }
            annot_size = num_cells / num_annots
            traced = true
            if traced
              data = num_annots.times.map do |i|
                cells = annot_size.times.map {|ii| "gatc_gatc_gatc_c#{i}_#{ii}" }
                {
                  # x: annot_size.times.map { (((rand + 1) * (rand + 1)) * 17 + i * 14).round(3) }.pack('f*'),
                  # y: annot_size.times.map { (rand * 140).round(3) }.pack('f*'),
                  x: annot_size.times.map { (((rand + 1) * (rand + 1)) * 17 + i * 14).round(3) },
                  y: annot_size.times.map { (rand * 140).round(3) },
                  cells: cells,
                  name: "cluster #{i} (#{annot_size} points)",
                  type: 'scattergl',
                  mode: 'markers',
                  marker: {:size=>3, :line=>{:color=>"rgb(40,40,40)", :width=>0}},
                  opacity: 1.0,
                  text: cells.map {|c| "<b>#{c}</b><br>#{fake_annotations[i]}"},
                  annotations: fake_annotations
                }
              end
            else
              data = {
                # x: (num_cells.times.map { |n| (rand * 140).round(3) }).pack('f*'),
                # y: (num_cells.times.map { |n| (rand * 14 + (n.to_f * 140.to_f / num_cells.to_f)).round(3)}).pack('f*'),
                x: num_cells.times.map { |n| (rand * 140).round(3) },
                y: num_cells.times.map { |n| (rand * 14 + (n.to_f * 140.to_f / num_cells.to_f)).round(3)},
                cells: num_cells.times.map {|n| "gatc_gatc_c#{n}" },
                type: 'scattergl',
                mode: 'markers',
                marker: {:size=>3, :width=>0},
                opacity: 1.0,
                annotations: num_cells.times.map {|n| "annot_#{(n * num_annots / num_cells).floor}" }
              }
            end
            Rails.logger.info "data #{data}"
            mock_response[:data] = data
            return mock_response.to_json
          end
        end

        def self.get_selected_subsample_threshold(param, cluster)
          subsample = nil
          if param.blank?
            # default to largest threshold available that is <10K
            subsample = ClusterVizService.default_subsampling(cluster)
          elsif param == 'all'
            subsample = nil
          else
            subsample = param.to_i
          end
          subsample
        end
      end
    end
  end
end
