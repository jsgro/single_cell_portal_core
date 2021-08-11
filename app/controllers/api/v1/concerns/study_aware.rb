module Api
  module V1
    module Concerns
      module StudyAware
        extend ActiveSupport::Concern

        def set_study
          @study = Study.any_of({accession: params[:study_id]},{id: params[:study_id]}).first
          if @study.nil? || @study.queued_for_deletion?
            head 404
          end
        end

        ##
        # Permission checks
        ##
        def check_study_view_permission
          unless @study.public?
            if !api_user_signed_in? && params[:reviewerSession].present?
              head 403 unless @study.reviewer_access&.session_valid?(params[:reviewerSession])
            elsif !api_user_signed_in?
              head 401
            else
              head 403 unless @study.can_view?(current_api_user)
            end
          end
        end

        def check_study_edit_permission
          if !api_user_signed_in?
            head 401
          else
            head 403 unless @study.can_edit?(current_api_user)
          end
        end

        def check_study_compute_permission
          if !api_user_signed_in?
            head 401
          else
            head 403 unless @study.can_compute?(current_api_user)
          end
        end

        def check_study_detached
          if @study.detached?
            head 410
          end
        end
      end
    end
  end
end
