class ExceptionsController < ApplicationController
  layout 'application'

  def render_error
    @exception = request.env["action_dispatch.exception"]
    MetricsService.report_error(@exception, request, current_user, @study)
    ErrorTracker.report_exception(@exception, current_user, @study, params)
    respond_to do |format|
      format.html { render action: 'render_error', status: :internal_server_error }
      format.json { render json: { error: @exception.message }, status: :internal_server_error }
    end
  end
end

