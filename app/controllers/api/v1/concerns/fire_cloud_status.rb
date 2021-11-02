module Api
  module V1
    module Concerns
      module FireCloudStatus
        extend ActiveSupport::Concern

        included do
          before_action :check_firecloud_status!, unless: proc {firecloud_independent_methods.include?(action_name.to_sym)}
        end

        # check on FireCloud API status and respond accordingly
        def check_firecloud_status!
          unless ApplicationController.firecloud_client.services_available?(FireCloudClient::SAM_SERVICE, FireCloudClient::RAWLS_SERVICE)
            alert = 'Study workspaces are temporarily unavailable, so we cannot complete your request.  Please try again later.'
            render json: {error: alert}, status: 503
          end
        end

        # methods to exclude from the required status check
        def firecloud_independent_methods
          [:index, :show]
        end
      end
    end
  end
end
