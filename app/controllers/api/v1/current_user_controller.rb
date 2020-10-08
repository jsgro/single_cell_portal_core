module Api
  module V1
    class CurrentUserController < ApiBaseController
      # collection of API methods related to the current user object.
      # for security reasons, the methods in this controller should be extremely tightly controlled
      include Concerns::Authenticator
      include Concerns::StudyAware
      include Swagger::Blocks

      before_action :set_current_api_user!

      ALLOWABLE_UPDATE_FIELDS = ["feature_flags"]
      # updates the current user object -- only allowed fields are able to be changed
      def update
        user = current_api_user

        if user.nil?
          # anonymous users can't change feature flags
          head 403 and return
        end

        # to ensure users can't arbitrarily change their own flags, restrict the list
        updated_user = params[:current_user]

        # if there are any fields included that are not allowed to be updated, return error
        if (ALLOWABLE_UPDATE_FIELDS - updated_user.keys).present?
          head 422 and return
        end

        updated_flags = updated_user.try(:[], :feature_flags)
        if !updated_flags || !updated_flags.respond_to?(:each)
          head 422 and return
        end

        current_flags = user.feature_flags
        updated_flags.each do |key, value|
          flag = FeatureFlag.find_by(name: key)
          if !flag || !flag.user_modifiable
            head 422 and return
          end
          if !value && value != false
            current_flags.delete(key)
          else
            # double-negate the value to make sure it is stored as boolean
            current_flags[key] = !!value
          end
        end

        user.update!(feature_flags: current_flags)

        # just return the feature flags object, to avoid exposing sensitive user fields
        render json: { feature_flags: current_flags } and return
      end
    end
  end
end
