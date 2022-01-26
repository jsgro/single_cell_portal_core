module Api
  module V1
    # lightweight wrapper to intercept all uncaught API-based exceptions and render JSON response
    class ExceptionsController < ApiBaseController
      def render_error
        @exception = request.env["action_dispatch.exception"]
        MetricsService.report_error(@exception, request, current_api_user, @study)
        ErrorTracker.report_exception(@exception, current_api_user, params)
        logger.error ([@exception.message] + @exception.backtrace).join($/)
        render json: {
          error: @exception.message,
          error_class: @exception.class.name,
          source: @exception.backtrace&.first
        }, status: :internal_server_error
      end
    end
  end
end
