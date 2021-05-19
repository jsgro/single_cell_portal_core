##
# API client bindings for retrieving information about Terra Data Repo datasets/snapshots/schemas from their API
##
class DataRepoClient < Struct.new(:access_token, :api_root, :storage, :expires_at, :service_account_credentials)
  # path to read-only service account JSON keyfile
  SERVICE_ACCOUNT_KEY = !ENV['READ_ONLY_SERVICE_ACCOUNT_KEY'].blank? ? (ENV['NOT_DOCKERIZED'] ? ENV['READ_ONLY_SERVICE_ACCOUNT_KEY'] : File.absolute_path(ENV['READ_ONLY_SERVICE_ACCOUNT_KEY'])) : ''
  # Google authentication scopes necessary for querying TDR API
  GOOGLE_SCOPES = %w(openid email profile)
  # GCP Compute project
  COMPUTE_PROJECT = ENV['GOOGLE_CLOUD_PROJECT'].blank? ? '' : ENV['GOOGLE_CLOUD_PROJECT']
  # Base API URL to request against
  BASE_URL = Rails.application.config.tdr_api_base_url
  # constant used for retry loops in process_firecloud_request and execute_gcloud_method
  MAX_RETRY_COUNT = 5
  # constant used for incremental backoffs on retries (in seconds); ignored when running unit/integration test suite
  RETRY_INTERVAL = Rails.env.test? ? 0 : 15

  # control variables
  SORT_DIRECTIONS = %w(asc desc).freeze
  SORT_OPTIONS = %w(name description created_date).freeze
  DATASET_INCLUDE_FIELDS = %w(NONE SCHEMA ACCESS_INFORMATION PROFILE DATA_PROJECT STORAGE).freeze
  ALL_DATASET_FIELDS = %w(SCHEMA ACCESS_INFORMATION PROFILE DATA_PROJECT STORAGE).freeze

  ##
  # Constructors & token management methods
  ##

  # initialize is called after instantiating with DataRepoClient.new
  # will set the access token, TDR base api url root and GCP storage driver instance
  #
  # * *params*
  #   - +service_account_key+: (String, Pathname) => Path to service account JSON keyfile
  # * *return*
  #   - +DataRepoClient+ object
  def initialize(service_account=SERVICE_ACCOUNT_KEY)
    # GCS storage driver attributes
    storage_attr = {
      project: COMPUTE_PROJECT,
      timeout: 3600,
      keyfile: service_account
    }

    self.service_account_credentials = service_account
    self.access_token = self.class.generate_access_token(service_account)
    self.storage = Google::Cloud::Storage.new(storage_attr)
    self.expires_at = Time.zone.now + self.access_token['expires_in']
    self.api_root = BASE_URL
  end

  # generate an access token to use for all requests
  #
  # * *return*
  #   - +Hash+ of Google Auth access token (contains access_token (string), token_type (string) and expires_in (integer, in seconds)
  def self.generate_access_token(service_account)
    # if no keyfile present, use environment variables
    creds_attr = {scope: GOOGLE_SCOPES}
    if !service_account.blank?
      creds_attr.merge!(json_key_io: File.open(service_account))
    end
    creds = Google::Auth::ServiceAccountCredentials.make_creds(creds_attr)
    token = creds.fetch_access_token!
    token
  end

  # refresh access_token when expired and stores back in FireCloudClient instance
  #
  # * *return*
  #   - +DateTime+ timestamp of new access token expiration
  def refresh_access_token!
    Rails.logger.info "DataRepoClient token expired, refreshing access token"
    new_token = self.class.generate_access_token(self.service_account_credentials)
    new_expiry = Time.zone.now + new_token['expires_in']
    self.access_token = new_token
    self.expires_at = new_expiry
    new_token
  end

  # check if an access_token is expired
  #
  # * *return*
  #   - +Boolean+ of token expiration
  def access_token_expired?
    Time.zone.now >= self.expires_at
  end

  # return a valid access token
  #
  # * *return*
  #   - +Hash+ of access token
  def valid_access_token
    self.access_token_expired? ? self.refresh_access_token! : self.access_token
  end

  # get issuer of storage credentials
  #
  # * *return*
  #   - +String+ of issuer email
  def issuer
    self.storage.service.credentials.issuer
  end

  ##
  # Abstract request handlers
  ##

  # submit a request to TDR API
  def process_api_request(http_method, path, payload: nil, retry_count: 0)
    # Log API call for auditing/tracking purposes
    Rails.logger.info "Terra Data Repo API request (#{http_method.to_s.upcase}) #{path}"

    # set default headers, appending application identifier including hostname for disambiguation
    headers = {
      'Authorization' => "Bearer #{self.valid_access_token['access_token']}",
      'Accept' => 'application/json',
      'x-app-id' => "single-cell-portal",
      'x-domain-id' => "#{ENV['HOSTNAME']}"
    }

    # process request
    begin
      response = RestClient::Request.execute(method: http_method, url: path, payload: payload, headers: headers)
      # handle response using helper
      handle_response(response)
    rescue RestClient::Exception => e
      current_retry = retry_count + 1
      context = " encountered when requesting '#{path}', attempt ##{current_retry}"
      log_message = "#{e.message}: #{e.http_body}; #{context}"
      Rails.logger.error log_message
      retry_time = retry_count * RETRY_INTERVAL
      sleep(retry_time)
      # only retry if status code indicates a possible temporary error, and we are under the retry limit and
      # not calling a method that is blocked from retries
      if should_retry?(e.http_code) && retry_count < MAX_RETRY_COUNT
        process_api_request(http_method, path, payload: payload, retry_count: current_retry)
      else
        # we have reached our retry limit or the response code indicates we should not retry
        ErrorTracker.report_exception(e, self.issuer, {
          method: http_method, url: path, payload: payload, retry_count: retry_count
        })
        error_message = parse_response_body(e.message)
        Rails.logger.error "Retry count exceeded when requesting '#{path}' - #{error_message}"
        raise e
      end
    end
  end

  # check if OK response code was found
  #
  # * *params*
  #   - +code+ (Integer) => integer HTTP response code
  #
  # * *return*
  #   - +Boolean+ of whether or not response is a known 'OK' response
  def ok?(code)
    [200, 201, 202, 204, 206].include?(code)
  end

  # determine if request should be retried based on response code, and will retry if necessary
  # only 502 (Bad Gateway), 503 (Service Unavailable), and 504 (Gateway Timeout) will be retried
  # all other 4xx and 5xx responses will not as they are deemed 'unrecoverable'
  #
  # * *params*
  #   - +code+ (Integer) => integer HTTP response code
  #
  # * *return*
  #   - +Boolean+ of whether or not response code indicates a retry should be executed
  def should_retry?(code)
    code.nil? || [502, 503, 504].include?(code)
  end

  # merge hash of options into single URL query string, will reject query params with empty values
  #
  # * *params*
  #   - +opts+ (Hash) => hash of query parameter key/value pairs
  #
  # * *return*
  #   - +String+ of concatenated query params
  def merge_query_options(opts={})
    return nil if opts.blank?
    '?' + opts.reject {|k,v| v.blank?}.to_a.map {|k,v| uri_encode("#{k}=#{v}")}.join('&')
  end

  # handle a RestClient::Response object
  #
  # * *params*
  #   - +response+ (String) => an RestClient response object
  #
  # * *return*
  #   - +Hash+ if response body is JSON, or +String+ of original body
  def handle_response(response)
    begin
      if ok?(response.code)
        response.body.present? ? parse_response_body(response.body) : true # blank body
      else
        response.message || parse_response_body(response.body)
      end
    rescue
      # don't report, just return
      response.message
    end
  end

  # parse a response body based on the content
  #
  # * *params*
  #   - +response_body+ (String) => an RestClient response body
  #
  # * *return*
  #   - +Hash+ if response body is JSON, or +String+ of original body
  def parse_response_body(response_body)
    begin
      JSON.parse(response_body)
    rescue
      response_body
    end
  end

  # URI-encode parameters for use in API requests
  #
  # * *params*
  #   - +parameter+ (String) => Parameter to encode
  #
  # * *returns*
  #   - +String+ => URI-encoded parameter
  def uri_encode(parameter)
    URI.escape(parameter)
  end

  ##
  # API ENDPOINT BINDINGS
  ##

  ##
  # Datasets
  ##

  # fetch all available datasets
  #
  # * *params*
  #   - +direction+ (String) => Sort direction (default: desc)
  #   - +filter+ (String) => Filter the results where this string is a case insensitive match in the name or description.
  #   - +limit+ (Integer) => The numbers datasets to retrieve
  #   - +offset+ (Integer) => The number of datasets to skip before when retrieving the next page
  #   - +sort+ (String) => The field to use for sorting: (name, description, created_date)
  #
  # * *returns*
  #   - (Array<Hash>) => Array of dataset JSON attributes
  def datasets(direction: 'desc', filter: nil, limit: 100, offset: 0, sort: 'name')
    validate_argument(:direction, direction, SORT_DIRECTIONS)
    validate_argument(:sort, sort, SORT_OPTIONS)
    query_opts = merge_query_options({direction: direction, filter: filter, limit: limit, offset: offset, sort: sort})
    path = api_root + '/api/repository/v1/datasets' + query_opts
    process_api_request(:get, path)
  end

  # fetch a single dataset
  #
  # * *params*
  #   - +dataset_id+ (String: UUID) => Dataset UUID
  #   - +include+ (Array) => Dataset fields to return from DATASET_INCLUDE_FIELDS (default: SCHEMA,PROFILE,DATA_PROJECT,STORAGE)
  #
  # * *returns*
  #   - (Hash) => Hash of dataset JSON attributes
  def dataset(dataset_id, include: ALL_DATASET_FIELDS)
    path = api_root + "/api/repository/v1/datasets/#{dataset_id}"
    if include.any?
      validate_argument(:include, include, DATASET_INCLUDE_FIELDS)
      query_opts = include.map {|i| "include=#{i}"}.join('&')
      path += "?#{query_opts}"
    end
    process_api_request(:get, path)
  end

  ##
  # Snapshots
  ##

  # fetch all available snapshots
  #
  # * *params*
  #   - +datasetIds+ (Array<String>) => Filter the results where these datasetIds are source datasets.
  #   - +direction+ (String) => Sort direction (default: desc)
  #   - +filter+ (String) => Filter the results where this string is a case insensitive match in the name or description.
  #   - +limit+ (Integer) => The numbers datasets to retrieve
  #   - +offset+ (Integer) => The number of datasets to skip before when retrieving the next page
  #   - +sort+ (String) => The field to use for sorting: (name, description, created_date)
  #
  # * *returns*
  #   - (Array<Hash>) => Array of snapshot JSON atributes
  def snapshots(datasetIds: [], direction: 'desc', filter: nil, limit: 100, offset: 0, sort: 'name')
    validate_argument(:direction, direction, SORT_DIRECTIONS)
    validate_argument(:sort, sort, SORT_OPTIONS)
    query_opts = merge_query_options(
      {
        datasetIds: datasetIds.join(','), direction: direction, filter: filter,
        limit: limit, offset: offset, sort: sort
      }
    )
    path = api_root + '/api/repository/v1/snapshots' + query_opts
    process_api_request(:get, path)
  end

  # fetch an individual snapshot
  #
  # * *params*
  #   - +snapshot_id+ (UUID) => Snapshot UUID
  #
  # * *returns*
  #   - (Hash) => Hash of snapshot JSON attributes
  def snapshot(snapshot_id)
    path = api_root + "/api/repository/v1/snapshots/#{snapshot_id}"
    process_api_request(:get, path)
  end

  private

  # generic validator for an argument to a method
  #
  # * *params*
  #   - +name+ (String, Symbol) => argument name
  #   - +value+ (Various) => Value for argument
  #   - +control+ (Array) => Array of acceptable values
  #
  # * *raises*
  #   - (ArgumentError) => if value is not a member of control
  def validate_argument(name, value, control)
    if value.is_a?(Array)
      # use array subtraction to find non-control values
      invalid = value - control
      if invalid.any?
        raise ArgumentError.new("invalid values for #{name}: #{invalid.join(',')}, must be a member of #{control}")
      end
    else
      raise ArgumentError.new("invalid value for #{name}: #{value}; must be a member of #{control}") if !control.include?(value)
    end
  end
end
