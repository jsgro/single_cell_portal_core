module Api
  module V1
    # reports endpoint.  No swagger docs since this is admin-user only
    # This returns tsv files
    class ReportsController < ApiBaseController
      include ActionController::RequestForgeryProtection

      before_action :authenticate_api_user!

      def show
        if !current_api_user.acts_like_reporter?
          head 403 and return
        end

        report_name = params[:report_name].to_sym
        response.headers['Content-Disposition'] = "attachment; filename=#{report_name}_data.tsv"
        begin
          render plain: ReportsService.get_report_data(report_name)
        rescue ArgumentError => e
          render json: {error: e.message}, status: 422
        end
      end
    end
  end
end
