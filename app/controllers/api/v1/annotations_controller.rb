module Api
  module V1
    # API methods for annotation-related data
    #
    # These methods are not tightly coupled with visualizations.
    # They might overlap somewhat with those in
    # visualizations/annotations_controller.rb, but methods in
    # this class do not depend on those methods.
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

      swagger_path '/studies/{accession}/annotation' do
        operation :post do
          key :tags, [
              'Studies'
          ]
          key :summary, 'Create annotation'
          key :description, 'Create new custom user annotation for the study'
          key :operationId, 'study_create_annotation_path'
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

      def create_annotation
          AnnotationService.create_user_annotation(@study, name, user_id, cluster_group_id,
            subsample_threshold, loaded_annotation, subsample_annotation,
            user_data_arrays_attributes)
      end
    end
  end
end
