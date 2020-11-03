module Api
  module V1
    module Visualization
      # API methods for visualizing cluster data
      # does NOT contain methods for editing clusters
      class ClustersController < ApiBaseController
        include Concerns::Authenticator
        include Concerns::StudyAware
        include Swagger::Blocks

        before_action :set_current_api_user!
        before_action :set_study
        before_action :check_study_view_permission

        # note that 'index' returns the default cluster, rather than a list of all clusters
        # see the 'show' method for documentation of the return type
        def index
          cluster = @study.default_cluster
          if cluster.nil?
            render json: {error: 'No default cluster exists'}, status: 422 and return
          end
          render json: self.class.get_cluster_viz_data(@study, cluster, params)
        end

        swagger_path '/api/v1/studies/{accession}/cluster' do
          operation :get do
            key :tags, [
                'Site'
            ]
            key :summary, 'Get a cluster and its sub-clusters'
            key :description, 'Get a cluster group and its constituent cluster annotations'
            key :operationId, 'site_study_cluster_path'
            parameter do
              key :name, :accession
              key :in, :path
              key :description, 'Accession of study'
              key :required, true
              key :type, :string
            end
            parameter do
              # Can't have in path, because cluster name often ends in file
              # extension (e.g. "foo.txt") that gets truncated (to e.g. "foo")
              key :name, :name
              key :in, :query
              key :description, 'Name of cluster group'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_name
              key :in, :query
              key :description, 'Name of annotation, as defined in cluster file'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_type
              key :in, :query
              key :description, 'Type of annotation.  One of “group” or “numeric”.' # TODO: Use enum
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_scope
              key :in, :query
              key :description, 'Scope of annotation.   One of “study” or “cluster”.'  # TODO: Use enum
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :subsample
              key :in, :query
              key :description, 'Number of cells to use as subsample threshold.  Omit parameter if not subsampling (i.e. if threshold is “all cells”).' # TODO: Use enum
              key :required, false
              key :type, :integer
            end
            parameter do
              key :name, :consensus
              key :in, :query
              key :description, 'Statistical parameter to use for consensus, e.g. “mean”.  Omit parameter if not applying consensus parameter.'  # TODO: Use enum
              key :required, false
              key :type, :string
            end
            response 200 do

            end
            response 401 do
              key :description, ApiBaseController.unauthorized
            end
            response 403 do
              key :description, ApiBaseController.forbidden('view study')
            end
            response 404 do
              key :description, ApiBaseController.not_found(Study)
            end
            response 406 do
              key :description, ApiBaseController.not_acceptable
            end
          end
        end

        def show
          # this endpoint requires a cluster to be specified -- index is used to fetch the default
          cluster = @study.cluster_groups.find_by(name: params[:cluster_name])
          if cluster.nil?
            render json: {error: "No cluster named #{params[:cluster_name]} could be found"}, status: 422 and return
          end
          render json: self.class.get_cluster_viz_data(@study, cluster, params)
        end

        # packages up a bunch of calls to rendering service endpoints for a response object
        def self.get_cluster_viz_data(study, cluster, url_params)
          annot_params = {
            name: url_params[:annotation_name].blank? ? nil : url_params[:annotation_name],
            type: url_params[:annotation_type].blank? ? nil : url_params[:annotation_type],
            scope: url_params[:annotation_scope].blank? ? nil : url_params[:annotation_scope]
          }
          annotation = ExpressionRenderingService.get_selected_annotation(study,
                                                                          cluster,
                                                                          annot_params[:name],
                                                                          annot_params[:type],
                                                                          annot_params[:scope])
          subsample = url_params[:subsample].blank? ? nil : url_params[:subsample]


          coordinates = ClusterRenderingService.load_cluster_group_data_array_points(study, cluster, annotation, subsample)
          plot_data = ClusterRenderingService.transform_coordinates(coordinates, study, cluster, annotation)

          if cluster.is_3d?
            range = ClusterRenderingService.set_range(cluster, coordinates.values)
            if cluster.has_range?
              aspect = ClusterRenderingService.compute_aspect_ratios(range)
            end
          end

          titles = ClusterRenderingService.load_axis_labels(cluster)

          axes_full = {
            :titles => titles,
            :ranges => range,
            :aspects => aspect
          }

          coordinate_labels = ClusterRenderingService.load_cluster_group_coordinate_labels(cluster)
          {
            "data": plot_data,
            "description": cluster.study_file.description,
            "is3D": cluster.is_3d?,
            "domainRanges": cluster.domain_ranges,
            "axes": axes_full,
            "hasCoordinateLabels": cluster.has_coordinate_labels?,
            "coordinateLabels": coordinate_labels
          }
        end
      end
    end
  end
end
