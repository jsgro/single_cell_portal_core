module Api
  module V1
    # API methods for user annotations

    class UserAnnotationsController < ApiBaseController
      include Concerns::Authenticator
      include Concerns::StudyAware
      include Concerns::ApiCaching
      include Swagger::Blocks

      before_action :set_current_api_user!
      before_action :set_study
      before_action :check_study_view_permission

      annotation_description_doc = 'Object with name (String), values (Array of unique values), type (String), scope (String), and cluster_name (string, if applicable)'

      swagger_path '/site/studies/{accession}/user_annotation' do
        operation :post do
          key :tags, [
              'Site'
          ]
          key :summary, 'Create user annotation'
          key :description, 'Create new custom user annotation for the study'
          key :operationId, 'site_study_user_create_annotation_path'
          parameter do
            key :name, :accession
            key :in, :path
            key :description, 'Study accession number (e.g. SCPXXX)'
            key :required, true
            key :type, :string
          end
          parameter do
            key :name, :user_annotation
            key :in, :body
            key :description, 'UserAnnotation object'
            schema do
              key :'$ref', :UserAnnotation
            end
          end
          response 200 do
            key :description, 'Successfully created user annotation'
          end
          extend SwaggerResponses::StudyControllerResponses
        end
      end

      def create_user_annotation

          message, annotations, status = UserAnnotationService.create_user_annotation(
            @study, params[:name], params[:user_data_arrays_attributes],
            params[:cluster], params[:loaded_annotation],
            params[:subsample_threshold], params[:subsample_annotation],
            current_api_user
          )

          response_body = {
            message: message, annotations: annotations
          }

          render json: response_body, status: status and return
      end
    end
  end
end
