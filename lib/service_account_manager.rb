##
# class methods for loading service account keyfiles & generating OAuth2 access tokens
# should be used in other classes via extend, e.g. `extend ServiceAccountManager`
##
module ServiceAccountManager
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

  # return the GCP project this instance is running in
  def compute_project
    ENV['GOOGLE_CLOUD_PROJECT']
  end

  # resolve filepath to primary service account (e.g. project owner) keyfile
  def get_primary_keyfile
    ENV['NOT_DOCKERIZED'] ? ENV['SERVICE_ACCOUNT_KEY']: File.absolute_path(ENV['SERVICE_ACCOUNT_KEY'])
  end

  # resolve filepath to primary service account (e.g. project owner) keyfile
  def get_read_only_keyfile
    ENV['NOT_DOCKERIZED'] ? ENV['READ_ONLY_SERVICE_ACCOUNT_KEY'] : File.absolute_path(ENV['READ_ONLY_SERVICE_ACCOUNT_KEY'])
  end
end
