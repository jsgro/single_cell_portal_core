class ReportsController < ApplicationController

  ###
  #
  # This controller only displays charts with information about site usage (e.g. number of studies, users, etc.)
  #
  ###

  before_action do
    authenticate_user!
    authenticate_reporter
  end

  # code has been removed from this method to improve page load speed
  # Api::V1::ReportsController now handles exporting study data
  def index; end

  def report_request; end

  # send a message to the site administrator requesting a new report plot
  def submit_report_request
    @subject = report_request_params[:subject]
    @requester = report_request_params[:requester]
    @message = report_request_params[:message]

    SingleCellMailer.admin_notification(@subject, @requestor, @message).deliver_now
    redirect_to reports_path, notice: 'Your request has been submitted.' and return
  end

  def export_submission_report
    if current_user.admin?
      @submission_stats = []
      AnalysisSubmission.order(:submitted_on => :asc).each do |analysis|
        @submission_stats << {submitter: analysis.submitter, analysis: analysis.analysis_name, status: analysis.status,
                              submitted_on: analysis.submitted_on, completed_on: analysis.completed_on,
                              firecloud_workspace: "#{analysis.firecloud_project}/#{analysis.firecloud_workspace}",
                              study_info_url: study_url(id: analysis.study_id)}
      end
      filename = "analysis_submissions_#{Date.today.strftime('%F')}.txt"
      report_headers = %w(email analysis status submission_date completion_date firecloud_workspace study_info_url).join("\t")
      report_data = @submission_stats.map {|sub| sub.values.join("\t")}.join("\n")
      send_data [report_headers, report_data].join("\n"), filename: filename
    else
      alert = 'You do not have permission to perform that action'
      respond_to do |format|
        format.html {redirect_to reports_path, alert: alert and return}
        format.js {render js: "alert('#{alert}');"}
        format.json {render json: {error: alert}, status: 403}
      end
    end
  end

  private

  def report_request_params
    params.require(:report_request).permit(:subject, :requester, :message)
  end
end
