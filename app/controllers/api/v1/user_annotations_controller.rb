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
            key :description, 'UserAnnotationInput object'
            schema do
              key :'$ref', :UserAnnotationInput
            end
          end
          response 200 do
            key :description, 'Successfully created user annotation'
          end
          extend SwaggerResponses::StudyControllerResponses
        end
      end

      def create_user_annotation

        begin
          message, annotations, status = UserAnnotationService.create_user_annotation(
            @study, params[:name], params[:user_data_arrays_attributes],
            params[:cluster], params[:loaded_annotation],
            params[:subsample_threshold], current_api_user
          )

          response_body = {
            message: message, annotations: annotations
          }

          render json: response_body, status: status

        # Handle other errors in saving user annotation
        rescue Mongoid::Errors::InvalidValue => e
          error_context = ErrorTracker.format_extra_context(study, {params: log_params})
          ErrorTracker.report_exception(e, current_user, error_context)
          # If an invalid value was somehow passed through the form, and couldn't save the annotation
          cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
          message = 'The following errors prevented the annotation from being saved: ' + 'Invalid data type submitted. (' + e.problem + '. ' + e.resolution + ')'
          Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, invalid value of #{e.message}"
          render json: {message: message}, status: 400 # Bad request

        rescue => e
          error_context = ErrorTracker.format_extra_context(study, {params: log_params})
          ErrorTracker.report_exception(e, current_user, error_context)
          # If a generic unexpected error occurred and couldn't save the annotation
          cluster_annotations = ClusterVizService.load_cluster_group_annotations(study, cluster, current_user)
          message = 'An unexpected error prevented the annotation from being saved: ' + e.message
          Rails.logger.error "Creating user annotation of params: #{user_annotation_params}, unexpected error #{e.message}"
          render json: {message: message}, status: 500
      end
    end
  end
end
