class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController

  ###
  #
  # This is the OAuth2 endpoint for receiving callbacks from Google after successful authentication
  #
  ###

  def google
    # You need to implement the method below in your model (e.g. app/models/user.rb)
    @user = User.from_omniauth(request.env["omniauth.auth"])

    begin
      provider = request.env["omniauth.auth"].dig('provider')
      self.class.validate_scopes_from_params(params, provider)
      self.class.validate_host_header_on_callback(request.headers)
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
      if TosAcceptance.accepted?(@user)
        MetricsService.merge_identities_in_mixpanel(@user, cookies)
        redirect_to request.env['omniauth.origin'] || site_path
      else
        redirect_to accept_tos_path(@user.id)
      end
    else
      redirect_to new_user_session_path
    end
  end

  def google_billing
    # You need to implement the method below in your model (e.g. app/models/user.rb)
    @user = User.from_omniauth(request.env["omniauth.auth"])

    begin
      provider = request.env["omniauth.auth"].dig('provider')
      self.class.validate_scopes_from_params(params, provider)
      self.class.validate_host_header_on_callback(request.headers)
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
      if TosAcceptance.accepted?(@user)
        MetricsService.merge_identities_in_mixpanel(@user, cookies)
        redirect_to billing_projects_path
      else
        redirect_to accept_tos_path(@user.id)
      end
    else
      redirect_to new_user_session_path
    end
  end

  # compare the granted scopes from the OAuth callback against those configured for the provider
  # if extra scopes have been granted (through spoofing or direct editing of the request redirect before consenting)
  # then raise a SecurityError and halt execution
  def self.validate_scopes_from_params(params, provider)
    requested_scopes = params[:scope].split
    configured_scopes = provider == 'google_billing' ? SingleCellPortal::Application::EXTENDED_GOOGLE_SCOPES : SingleCellPortal::Application::BASIC_GOOGLE_SCOPES
    requested_scopes.each do |scope|
      # trim auth URL off of name for comparison
      scope_name = scope.starts_with?('https://www.googleapis.com/auth/') ? scope.split('/').last : scope
      if !configured_scopes.include?(scope_name)
        error_message = "Invalid scope requested in OAuth callback: #{scope_name}, not configured for #{provider}: #{configured_scopes}"
        raise SecurityError.new(error_message)
      end
    end
  end

  # ensure that no host header injection has taken place
  def self.validate_host_header_on_callback(headers)
    host_header = headers['HTTP_HOST']&.encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
    if host_header.present? && host_header != RequestUtils.get_hostname
      error_message = "Invalid host header in callback: #{host_header}, does not match #{RequestUtils.get_hostname}"
      raise SecurityError.new(error_message)
    end
  end
end
