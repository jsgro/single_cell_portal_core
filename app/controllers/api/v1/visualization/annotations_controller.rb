module Api
  module V1
    module Visualization
      # API methods for visualizing cluster data
      # does NOT contain methods for editing clusters
      class AnnotationsController < ApiBaseController
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

        # shared
        annot_param_docs = [{
            name: :accession,
            in: :path,
            description: 'Accession of study',
            required: true,
            type: :string
          },
          {
            name: :annotation_name,
            in: :path,
            description: 'Name of annotation',
            type: :string
          },
          {
            name: :annotation_type,
            in: :query,
            description: 'Type of annotation.  One of “group” or “numeric”.',
            type: :string,
            enum: VALID_TYPE_VALUES
          },
          {
            name: :annotation_scope,
            in: :query,
            description: 'Scope of annotation.   One of “study” or “cluster”.',
            type: :string,
            enum: VALID_SCOPE_VALUES
          }]

        annot_response_docs = [
          {code: 200, description: 'Annotation json object'},
          {code: 401, description: ApiBaseController.unauthorized},
          {code: 403, description: ApiBaseController.forbidden('view study')},
          {code: 404, description: ApiBaseController.not_found(Study)},
          {code: 406, description: ApiBaseController.not_acceptable},
        ]

        swagger_path '/studies/{accession}/annotations' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get the default annotation for a study'
            key :description, 'Get the default annotation'
            key :operationId, 'study_annotations_path'
            annot_param_docs.each { |doc| parameter(doc) }
            annot_response_docs.each { |doc| response doc[:code], doc }
          end
        end

        # get all annotations for the study, listed by cluster/type
        def index
          # create a hash of subsample options with cluster names as keys
          render json: ClusterVizService.get_study_annotation_options(@study, current_api_user)
        end

        swagger_path '/studies/{accession}/annotations/{annotation_name}' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get an annotation for a study'
            key :description, 'Get the annotation s'
            key :operationId, 'study_cluster_path'
            parameter({
              name: :annotation_name,
              in: :path,
              description: 'Name of annotation',
              required: true,
              type: :string
            })
            annot_param_docs.each { |doc| parameter(doc) }
            annot_response_docs.each { |doc| response doc[:code], doc }
          end
        end

        def show
          annot_params = {
            name: params[:annotation_name].blank? ? nil : params[:annotation_name],
            type: params[:annotation_type].blank? ? nil : params[:annotation_type],
            scope: params[:annotation_scope].blank? ? nil : params[:annotation_scope]
          }
          cluster = nil
          if annot_params[:scope] == 'cluster'
            if params[:cluster].empty?
              render json: {error: 'You must specify the cluster for cluster scoped annotations'}, status: 404
            end
            cluster = @study.cluster_groups.by_name(params[:cluster])
          end
          annotation = ExpressionVizService.get_selected_annotation(@study,
                                                                    cluster,
                                                                    annot_params[:name],
                                                                    annot_params[:type],
                                                                    annot_params[:scope])
          if params[:value_format] == 'cellValues'
            render plain: ClusterVizService.annotation_cell_values_tsv(@study, @study.default_cluster, annotation)
          else
            render json: annotation
          end
        end
      end
    end
  end
end
