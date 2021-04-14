class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController

  # Google OAuth2 Scopes
  # basic scopes are user profile, email, and openid, and do not require user consent to request during auth handshake
  BASIC_GOOGLE_SCOPES = %w(email profile userinfo.email userinfo.profile openid)

  # extended scopes add cloud-billing.readonly which requires user consent
  # these are only requested when users attempt to visit the "My Billing Projects" page
  EXTENDED_GOOGLE_SCOPES = BASIC_GOOGLE_SCOPES.dup + %w(cloud-billing.readonly)

  ###
  #
  # This is the OAuth2 endpoint for receiving callbacks from Google after successful authentication
  #
  ###

  def google
    # You need to implement the method below in your model (e.g. app/models/user.rb)
    @user = User.from_omniauth(request.env["omniauth.auth"])

    begin
      validate_scopes_from_params
    rescue SecurityError => e
      head 400 and return
    end

    if @user.persisted?
      @user.update(authentication_token: Devise.friendly_token(32))
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
      validate_scopes_from_params
    rescue SecurityError => e
      head 400 and return
    end

    if @user.persisted?
      @user.update(authentication_token: Devise.friendly_token(32))
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

  private

  # compare the granted scopes from the OAuth callback against those configured for the provider
  # if extra scopes have been granted (through spoofing or direct editing of the request redirect before consenting)
  # then raise a SecurityError and halt execution
  def validate_scopes_from_params
    requested_scopes = params[:scope].split
    provider = request.env["omniauth.auth"].dig('provider')
    configured_scopes = provider == 'google_billing' ? EXTENDED_GOOGLE_SCOPES : BASIC_GOOGLE_SCOPES
    requested_scopes.each do |scope|
      # trim auth URL off of name for comparison
      scope_name = scope.starts_with?('https://www.googleapis.com/auth/') ? scope.split('/').last : scope
      if !configured_scopes.include?(scope_name)
        error_message = "Invalid scope requested in OAuth callback: #{scope_name}, not configured for #{provider}: #{configured_scopes}"
        sign_out @user if @user.present?
        Rails.logger.error error_message
        raise SecurityError.new(error_message)
      end
    end
  end
end
