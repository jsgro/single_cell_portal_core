module Api
  module V1
    # API methods for user annotations

    class UserAnnotationsController < ApiBaseController
      include Concerns::Authenticator
      include Concerns::ApiCaching
      include Concerns::StudyAware
      include Swagger::Blocks

      before_action :set_current_api_user!
      before_action :set_study
      before_action :check_study_view_permission

      # Define parameters used in API POST endpoint to create user annotations
      swagger_schema :UserAnnotationInput do
        key :name, 'UserAnnotation'
        property :name do
          key :type, :string
          key :description, 'Name of new custom user annotation'
        end
        property :user_data_arrays_attributes do
          key :type, :object
          key :description, 'Labels (names) and cell name arrays (values) for each selection'
        end
        property :cluster do
          key :type, :string
          key :description, 'Cluster group name'
        end
        property :subsample_threshold do
          key :type, :string
          key :description, 'Subsample threshold'
        end
        property :subsample_annotation do
          key :type, :string
          key :description, 'Subsample annotation'
        end
      end

      swagger_path '/studies/{accession}/user_annotation' do
        operation :post do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Create user annotation'
          key :description, 'Create new custom user annotation for the study'
          key :operationId, 'site_study_user_create_annotation_path'
          parameter do
            key :name, :accession
            key :in, :path
            key :description, 'Study accession number (e.g. SCP123)'
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

      def create

        begin
          # Parameters to log for any errors
          user_annotation_params = params.dup
          user_annotation_params[:current_user] = current_user
          log_params = user_annotation_params.dup

          # Don't log data_arrays to Sentry; it's too big
          log_params.delete(:user_data_arrays_attributes)

          cluster = params[:cluster]

          message, annotations = UserAnnotationService.create_user_annotation(
            @study, params[:name], params[:user_data_arrays_attributes],
            cluster, params[:loaded_annotation],
            params[:subsample_threshold], current_api_user
          )

          render json: {message: message, annotations: annotations}

        # Handle errors in saving user annotation
        rescue ArgumentError => e
          error_context = ErrorTracker.format_extra_context(@study, {params: log_params})
          ErrorTracker.report_exception(e, current_user, error_context)
          render json: {error: e.message}, status: 400 # Bad request
        rescue => e
          ErrorTracker.report_exception(e, current_user, error_context)
          message = 'An unexpected error prevented the annotation from being saved: ' + e.message
          render json: {error: message}, status: 500 # Server error
        end
      end
    end
  end
end
