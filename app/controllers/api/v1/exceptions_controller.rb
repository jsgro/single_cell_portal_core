module Api
  module V1
    # lightweight wrapper to intercept all uncaught API-based exceptions and render JSON response
    class ExceptionsController < ApiBaseController
      def render_error
        ::RequestUtils.log_exception(request, params, user: current_api_user, study: @study)
        render json: ::RequestUtils.exception_json(request.env['action_dispatch.exception']),
               status: :internal_server_error
      end
    end
  end
end
