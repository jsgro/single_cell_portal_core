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
        def index
          annot_params = @study.default_annotation_params
          if annot_params.nil?
            render json: {error: 'No default annotation exists'}, status: 422
          end
          render json: get_cluster_viz_data(
            cluster: @study.default_cluster,
            annotation_name: annot_params[:name],
            annotation_scope: annot_params[:scope],
            annotation_type: annot_params[:type]
          )
        end

        def show
          cluster = @study.cluster_groups.find_by(name: params[:cluster_name])
          if cluster.nil?
            render json: {error: "No cluster named #{params[:cluster_name]} could be found"}, status: 422
          end
          annot_params = @study.default_annotation_params(cluster)
          render json: get_cluster_viz_data(
            cluster: cluster,
            annotation_name: annot_params[:name],
            annotation_scope: annot_params[:scope],
            annotation_type: annot_params[:type]
            subsample: params[:subsample],
            consensus: params[:consensus]
          )
        end

        def get_cluster_viz_data(cluster:,
                                 annotation_name:,
                                 annotation_scope:,
                                 annotation_type:,
                                 subsample: nil,
                                 consensus: nil)
          { message: 'not yet implemented'}
        end

      end
    end
  end
end
