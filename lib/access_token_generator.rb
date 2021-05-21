module AccessTokenGenerator
  # generate an access token from a service account JSON keyfile
  #
  # * *params*
  #   - +service_account+ (Pathname) => path to service account JSON keyfile
  #
  # * *returns*
  #   - (Hash) => OAuth2 access token hash, with the following attributes
  #     - +access_token+ (String) => OAuth2 access token
  #     - +expires_in+ (Integer) => duration of token, in seconds
  #     - +token_type+ (String) => type of access token (e.g. 'Bearer')
  def generate_access_token(service_account)
    creds_attr = {scope: self::GOOGLE_SCOPES}
    if !service_account.blank?
      creds_attr.merge!(json_key_io: File.open(service_account))
    end
    creds = Google::Auth::ServiceAccountCredentials.make_creds(creds_attr)
    token = creds.fetch_access_token!
    token
  end
end
