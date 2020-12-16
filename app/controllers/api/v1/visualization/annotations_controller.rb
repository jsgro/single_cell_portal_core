module Api
  module V1
    module Visualization
      # API methods for visualizing annotation-related data
      # does NOT contain methods for editing annotations
      class AnnotationsController < ApiBaseController
        include Concerns::Authenticator
        include Concerns::StudyAware
        include Concerns::ApiCaching
        include Swagger::Blocks

        VALID_SCOPE_VALUES = ['study', 'cluster']
        VALID_TYPE_VALUES = ['group', 'numeric']

        before_action :set_current_api_user!
        before_action :set_study
        before_action :check_study_view_permission
        before_action :check_api_cache!
        after_action :write_api_cache!

        annotation_description_doc = 'Object with name (String), values (Array of unique values), type (String), scope (String), and cluster_name (string, if applicable)'

        swagger_path '/studies/{accession}/annotations' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get all annotations for the study'
            key :description, 'Get all annotations for the study, with name, values, type, scope, and cluster_name if applicable'
            key :operationId, 'study_annotations_path'
            parameter({
              name: :accession,
              in: :path,
              description: 'Study accession number (e.g. SCPXXX)',
              required: true,
              type: :string
            })
            response 200 do
              key :description, 'Array of Annotation objects'
              schema do
                key :type, :array
                key :title, 'Array'
                items do
                  key :title, 'Annotation'
                  key :description, annotation_description_doc
                end
              end
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        #
        def index
          render json: AnnotationVizService.available_annotations(@study, nil, current_api_user)
        end

        swagger_path '/studies/{accession}/annotations/{annotation_name}' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get an annotation for a study'
            key :description, 'Get a single annotation object'
            key :operationId, 'study_annotation_path'

            parameter do
              key :name, :accession
              key :in, :path
              key :description, 'Study accession number (e.g. SCPXXX)'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_name
              key :in, :path
              key :description, 'Name of annotation'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_type
              key :in, :query
              key :description, 'Type of annotation. One of "group" or "numeric".'
              key :type, :string
              key :enum, VALID_TYPE_VALUES
            end
            parameter do
              key :name, :annotation_scope
              key :in, :query
              key :description, 'Scope of annotation.  One of "study" or "cluster".'
              key :type, :string
              key :enum, VALID_SCOPE_VALUES
            end
            response 200 do
              key :description, annotation_description_doc
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        def show
          annotation = self.class.get_selected_annotation(@study, params)
          render json: annotation
        end

        swagger_path '/studies/{accession}/annotations/{annotation_name}/cell_values' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get cell values for an annotation for a study'
            key :description, 'Get cell values for an annotation object.  Useful for e.g. dot plots.'
            key :operationId, 'study_annotation_cell_values_path'
            parameter do
              key :name, :accession
              key :in, :path
              key :description, 'Study accession number (e.g. SCPXXX)'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_name
              key :in, :path
              key :description, 'Name of annotation'
              key :required, true
              key :type, :string
            end
            parameter do
              key :name, :annotation_type
              key :in, :query
              key :description, 'Type of annotation. One of "group" or "numeric".'
              key :type, :string
              key :enum, VALID_TYPE_VALUES
            end
            parameter do
              key :name, :annotation_scope
              key :in, :query
              key :description, 'Scope of annotation.  One of "study" or "cluster".'
              key :type, :string
              key :enum, VALID_SCOPE_VALUES
            end
            response 200 do
              key :description, '2-column TSV of cell names and their values for the requested annotation.  Column headers are NAME (the cell name) and the name of the returned annotation'
            end
            extend SwaggerResponses::StudyControllerResponses
          end
        end

        def cell_values
          annotation = self.class.get_selected_annotation(@study, params)
          cell_cluster = @study.cluster_groups.by_name(params[:cluster])
          if cell_cluster.nil?
            cell_cluster = @study.default_cluster
          end
          render plain: AnnotationVizService.annotation_cell_values_tsv(@study, cell_cluster, annotation)
        end

        # parses the url params to identify the selected cluster
        def self.get_selected_annotation(study, params)
          annot_params = get_annotation_params(params)
          if annot_params[:name] == '_default'
            annot_params[:name] = nil
          end
          cluster = nil
          if annot_params[:scope] == 'cluster'
            if params[:cluster].blank?
              render(json: {error: 'You must specify the cluster for cluster-scoped annotations'}, status: 404) and return
            end
            cluster = study.cluster_groups.by_name(params[:cluster])
          end
          AnnotationVizService.get_selected_annotation(study,
                                                       cluster,
                                                       annot_params[:name],
                                                       annot_params[:type],
                                                       annot_params[:scope])
        end


        # parses url params into an object with name, type, and scope keys
        def self.get_annotation_params(url_params)
           {
            name: url_params[:annotation_name].blank? ? nil : url_params[:annotation_name],
            type: url_params[:annotation_type].blank? ? nil : url_params[:annotation_type],
            scope: url_params[:annotation_scope].blank? ? nil : url_params[:annotation_scope]
          }
        end
      end
    end
  end
end
