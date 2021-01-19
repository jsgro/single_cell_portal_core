module Api
  module V1
    # reports endpoint.  No swagger docs since this is admin-user only
    # This returns tsv files
    class ReportsController < ApiBaseController
      include ActionController::RequestForgeryProtection

      before_action :authenticate_api_user!

      def show
        if !current_api_user.admin?
          head 403 and return
        end

        report_name = params[:report_name].to_sym
        if !ReportsService::REPORTS.keys.include?(report_name)
          render(json: {error: "unrecognized report"}, status: 422) and return
        end
        response.headers['Content-Disposition'] = 'attachment; filename=studies_data.tsv'
        render plain: ReportsService.get_report_data(report_name)
      end
    end
  end
end
