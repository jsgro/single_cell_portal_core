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
        before_action :check_api_cache!
        after_action :write_api_cache!


        swagger_path '/studies/{accession}/clusters' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get the default cluster and its sub-clusters for a study'
            key :description, 'Get the default cluster group and its constituent cluster annotations'
            key :operationId, 'study_clusters_path'
            response 200 do
              key :type, :array
              key :description, 'Array of all cluster group names for this study'
              items do
                key :type, :string
                key :description, 'Name of cluster'
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
            parameter({
              name: :accession,
              in: :path,
              description: 'Accession of study',
              required: true,
              type: :string
            })
            parameter({
              name: :cluster_name,
              in: :path,
              description: 'Name of cluster group.  Use "_default" to return the default cluster',
              required: true,
              type: :string
            })
            response 200 do
              key :description, 'Cluster visualization, suitable for rendering in Plotly'
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        def show
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
          viz_data = self.class.get_cluster_viz_data(@study, cluster, params)
          if viz_data.nil?
            render json: {error: 'Annotation could not be found'}, status: 404 and return
          end
          render json: viz_data
        end

        # packages up a bunch of calls to rendering service endpoints for a response object
        def self.get_cluster_viz_data(study, cluster, url_params)
          annot_params = AnnotationsController.get_annotation_params(url_params)
          annotation = AnnotationVizService.get_selected_annotation(study,
                                                       cluster,
                                                       annot_params[:name],
                                                       annot_params[:type],
                                                       annot_params[:scope])
          if !annotation
            return nil
          end

          subsample = url_params[:subsample].blank? ? nil : url_params[:subsample]

          colorscale = url_params[:colorscale].blank? ? 'Reds' : url_params[:colorscale]

          coordinates = ClusterVizService.load_cluster_group_data_array_points(study, cluster, annotation, subsample, colorscale)
          plot_data = ClusterVizService.transform_coordinates(coordinates, study, cluster, annotation)

          if cluster.is_3d?
            range = ClusterVizService.set_range(cluster, coordinates.values)
            if cluster.has_range?
              aspect = ClusterVizService.compute_aspect_ratios(range)
            end
          end

          titles = ClusterVizService.load_axis_labels(cluster)

          axes_full = {
            titles: titles,
            ranges: range,
            aspects: aspect
          }

          coordinate_labels = ClusterVizService.load_cluster_group_coordinate_labels(cluster)
          {
            "data": plot_data,
            "description": cluster.study_file.description,
            "is3D": cluster.is_3d?,
            "isSubsampled": cluster.subsampled?,
            "numPoints": cluster.points,
            "domainRanges": cluster.domain_ranges,
            "axes": axes_full,
            "hasCoordinateLabels": cluster.has_coordinate_labels?,
            "coordinateLabels": coordinate_labels,
            "annotParams": annot_params
          }
        end
      end
    end
  end
end
