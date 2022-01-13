class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController

  ###
  #
  # This is the OAuth2 endpoint for receiving callbacks from Google after successful authentication
  #
  ###

  def google_oauth2
    # You need to implement the method below in your model (e.g. app/models/user.rb)
    @user = User.from_omniauth(request.env["omniauth.auth"])

    begin
      self.class.validate_scopes_from_params(params)
    rescue SecurityError => e
      logger.error e.message
      ErrorTracker.report_exception(e, @user, params)
      MetricsService.report_error(e, request, @user)
      sign_out @user if @user.present?
      head 400 and return
    end

    if @user.persisted?
      @user.generate_access_token
      # update a user's FireCloud status
      @user.delay.update_firecloud_status
      sign_in(@user)
      @alert = nil
      # check if user needs to accept updated Terra ToS
      if @user.must_accept_terra_tos?
        @alert = 'We have detected that Terra has updated their terms of service - please visit ' \
                 "<a href='https://app.terra.bio' target='_blank'>Terra</a> to accept the updated terms.  Some " \
                 'features may not function correctly until you do so.'
      end
      if TosAcceptance.accepted?(@user)
        MetricsService.merge_identities_in_mixpanel(@user, cookies)
        requested_path = request.env['omniauth.origin'] || site_path
        redirect_to requested_path, alert: @alert
      else
        redirect_to accept_tos_path(@user.id), alert: @alert
      end
    else
      redirect_to new_user_session_path
    end
  end

  # compare the granted scopes from the OAuth callback against those configured for the provider
  # if extra scopes have been granted (through spoofing or direct editing of the request redirect before consenting)
  # then raise a SecurityError and halt execution
  def self.validate_scopes_from_params(params)
    requested_scopes = params[:scope].split
    configured_scopes = SingleCellPortal::Application::BASIC_GOOGLE_SCOPES
    requested_scopes.each do |scope|
      # trim auth URL off of name for comparison
      scope_name = scope.starts_with?('https://www.googleapis.com/auth/') ? scope.split('/').last : scope
      if !configured_scopes.include?(scope_name)
        error_message = "Invalid scope requested in OAuth callback: #{scope_name}, not in: #{configured_scopes}"
        raise SecurityError.new(error_message)
      end
    end
  end
end
