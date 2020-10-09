module Api
  module V1
    class CurrentUserController < ApiBaseController
      # collection of API methods related to the current user object.
      # for security reasons, the methods in this controller should be extremely tightly controlled
      include Concerns::Authenticator
      include Concerns::StudyAware
      include Swagger::Blocks

      before_action :set_current_api_user!

      ALLOWABLE_UPDATE_FIELDS = ['feature_flags']
      # to ensure users can't arbitrarily change their own flags, restrict the list
      ALLOWABLE_UPDATE_FEATURE_FLAGS = ['faceted_search']
      # updates the current user object -- only allowed fields are able to be changed
      def update
        user = current_api_user

        if user.nil?
          # anonymous users can't change feature flags
          head 403 and return
        end

        updated_user = params[:current_user]
        # if there are any fields included that are not allowed to be updated, return error
        if (ALLOWABLE_UPDATE_FIELDS - updated_user.keys).present?
          head 422 and return
        end

        begin
          user.update_feature_flags_safe!(updated_user.try(:[], :feature_flags), ALLOWABLE_UPDATE_FEATURE_FLAGS)
        rescue => e
          puts e.message
          head 422 and return
        end

        # just return the feature flags object, to avoid exposing sensitive user fields
        render json: { feature_flags: user.feature_flags } and return
      end
    end
  end
end
