# Query Human Cell Atlas Azul service for metadata associated with both experimental and analysis data
# No ServiceAccountManager or GoogleServiceClient includes as all requests are unauthenticated for public data
class HcaAzulClient < Struct.new(:api_root)
  include ApiHelpers

  GOOGLE_SCOPES = %w[openid email profile].freeze
  BASE_URL = 'https://service.azul.data.humancellatlas.org'.freeze

  # list of available HCA catalogs
  HCA_CATALOGS = %w[dcp1 dcp6 dcp7 it1 it6 it7 it0lungmap lungmap].freeze

  # List of accepted formats for manifest files
  MANIFEST_FORMATS = %w[compact full terra.bdbag terra.pfb curl].freeze

  ##
  # Constructors & token management methods
  ##

  # base constructor
  #
  # * *return*
  #   - +HcaAzulClient+ object
  def initialize
    self.api_root = BASE_URL
  end

  ##
  # Abstract request handlers/heplers
  ##

  # submit a request to HCA Azul Service API
  #
  # * *params*
  #   - +http_method+ (String, Symbol) => HTTP method, e.g. :get, :post
  #   - +path+ (String) => Relative URL path for API request being made
  #   - +payload+ (Hash) => Hash representation of request body
  #   - +retry_count+ (Integer) => Counter for tracking request retries
  #
  # * *returns*
  #   - (Hash) => Parsed response body, if present
  #
  # * *raises*
  #   - (RestClient::Exception) => if HTTP request fails for any reason
  def process_api_request(http_method, path, payload: nil, retry_count: 0)
    # Log API call for auditing/tracking purposes
    Rails.logger.info "HCA Azul API request (#{http_method.to_s.upcase}) #{path}"
    # process request
    begin
      headers = {
        'Accept' => 'application/json',
        'Content-Type' => 'application/json',
        'x-app-id' => 'single-cell-portal',
        'x-domain-id' => "#{ENV['HOSTNAME']}"
      }
      response = RestClient::Request.execute(method: http_method, url: path, payload: payload, headers: headers)
      # handle response using helper
      handle_response(response)
    rescue RestClient::Exception => e
      current_retry = retry_count + 1
      context = " encountered when requesting '#{path}', attempt ##{current_retry}"
      log_message = "#{e.message}: #{e.http_body}; #{context}"
      Rails.logger.error log_message
      retry_time = retry_count * ApiHelpers::RETRY_INTERVAL
      sleep(retry_time)
      # only retry if status code indicates a possible temporary error, and we are under the retry limit and
      # not calling a method that is blocked from retries
      if should_retry?(e.http_code) && retry_count < ApiHelpers::MAX_RETRY_COUNT
        process_api_request(http_method, path, payload: payload, retry_count: current_retry)
      else
        # we have reached our retry limit or the response code indicates we should not retry
        ErrorTracker.report_exception(e, nil, {
          method: http_method, url: path, payload: payload, retry_count: retry_count
        })
        error_message = parse_response_body(e.message)
        Rails.logger.error "Retry count exceeded when requesting '#{path}' - #{error_message}"
        raise e
      end
    end
  end

  # take a Hash/JSON object and format as a query string parameter
  #
  # * *params*
  #   - +query_params+ (Hash) => Hash of query parameters
  #
  # * *returns*
  #   - (String) => URL-encoded string version of query parameters
  def format_hash_as_query_string(query_params)
    # replace Ruby => assignment operators with JSON standard colons (:)
    sanitized_params = query_params.to_s.gsub(/=>/, ':')
    CGI.escape(sanitized_params)
  end

  # API endpoint bindings

  # get a metadata TSV file for a given HCA project UUID
  #
  # * *params*
  #   - +catalog+ (String) => HCA catalog name, from HCA_CATALOGS
  #   - +project_id+ (UUID) => HCA project UUID
  #   - +format+ (string) => manifest file format, from MANIFEST_FORMATS
  #
  # * *returns*
  #   - (Hash) => Hash response including an HTTP status code and a location to download
  #
  # * *raises*
  #   - (ArgumentError) => if catalog is not in HCA_CATALOGS or format is not in MANIFEST_FORMATS
  def get_project_manifest_link(catalog, project_id, format = 'compact')
    unless HCA_CATALOGS.include?(catalog)
      raise ArgumentError, "#{catalog} is not a valid catalog: #{HCA_CATALOGS.join(',')}"
    end
    unless MANIFEST_FORMATS.include?(format)
      raise ArgumentError, "#{format} is not a valid format: #{MANIFEST_FORMATS.join(',')}"
    end

    path = self.api_root + "/fetch/manifest/files?catalog=#{catalog}"
    project_filter = { 'projectId' => { 'is' => [project_id] } }
    filter_query = format_hash_as_query_string(project_filter)
    path += "&filters=#{filter_query}&format=#{format}"
    process_api_request(:get, path)
  end
end
