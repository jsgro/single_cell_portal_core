# Query Human Cell Atlas Azul service for metadata associated with both experimental and analysis data
# No ServiceAccountManager or GoogleServiceClient includes as all requests are unauthenticated for public data
class HcaAzulClient < Struct.new(:api_root)
  include ApiHelpers

  GOOGLE_SCOPES = %w[openid email profile].freeze
  BASE_URL = 'https://service.azul.data.humancellatlas.org'.freeze

  # maximum wait time for manifest generation
  MAX_MANIFEST_TIMEOUT = 30.seconds.freeze

  # List of accepted formats for manifest files
  MANIFEST_FORMATS = %w[compact full terra.bdbag terra.pfb curl].freeze

  # maximum number of results to return
  MAX_RESULTS = 250

  # Default headers for API requests
  DEFAULT_HEADERS = {
    'Accept' => 'application/json',
    'Content-Type' => 'application/json',
    'x-app-id' => 'single-cell-portal',
    'x-domain-id' => "#{ENV['HOSTNAME']}"
  }.freeze

  ##
  # Constructors & token management methods
  ##

  # base constructor
  #
  # * *return*
  #   - +HcaAzulClient+ object
  def initialize
    super
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
      execute_http_request(http_method, path, payload)
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

  # sub-handler for making external HTTP request
  # does not have error handling, this is done by process_api_request
  # allows for some methods to implement their own error handling (like health checks)
  #
  # * *params*
  #   - +http_method+ (String, Symbol) => HTTP method, e.g. :get, :post
  #   - +path+ (String) => Relative URL path for API request being made
  #   - +payload+ (Hash) => Hash representation of request body
  #
  # * *returns*
  #   - (Hash) => Parsed response body, if present
  #
  # * *raises*
  #   - (RestClient::Exception) => if HTTP request fails for any reason
  def execute_http_request(http_method, path, payload = nil)
    response = RestClient::Request.execute(method: http_method, url: path, payload: payload, headers: DEFAULT_HEADERS)
    # handle response using helper
    handle_response(response)
  end

  ##
  # API endpoint bindings
  ##

  # basic health check - does not give detailed status information, only checks for { 'up' => true }
  # bypasses process_api_request to avoid error handling/retries
  #
  # * *returns*
  #   - (Boolean) => T/F if Azul is responding to requests
  def api_available?
    path = "#{api_root}/health/basic"
    begin
      status = execute_http_request(:get, path)
      status && status['up']
    rescue RestClient::ExceptionWithResponse => e
      Rails.logger.error "Azul service unavailable: #{e.message}"
      ErrorTracker.report_exception(e, nil, { method: :get, url: path, code: e.http_code })
      false
    end
  end

  # check Azul service status via "fast" health check
  #
  # * *returns*
  #   - (Hash) => Hash of Azul services/endpoint status
  def status
    path = "#{api_root}/health/fast"
    begin
      execute_http_request(:get, path)
    rescue RestClient::ExceptionWithResponse => e
      Rails.logger.error "Azul service unavailable: #{e.message}"
      ErrorTracker.report_exception(e, nil, { method: :get, url: path, code: e.http_code })
      JSON.parse(e.http_body) if e.http_body.present? # response body should have more information than error message
    end
  end

  # get a list of all available catalogs
  #
  # * *returns*
  #   - (Hash) => Available catalogs, including :default_catalog
  def catalogs
    path = "#{api_root}/index/catalogs"
    process_api_request(:get, path)
  end

  # get a list of all available projects
  #
  # * *params*
  #   - +catalog+ (String) => HCA catalog name (optional)
  #   - +query+ (Hash) => query object from :format_query_object
  #   - +terms+ (Array<String>) => Array of terms to use for filtering search results
  #   - +size+ (Integer) => number of results to return (default is 250)
  #
  # * *returns*
  #   - (Hash) => Available projects
  #
  # * *raises*
  #   - (ArgumentError) => if catalog is not in self.all_catalogs
  def projects(catalog: nil, query: {}, terms: [], size: MAX_RESULTS)
    base_path = "#{api_root}/index/projects"
    base_path += "?filters=#{format_hash_as_query_string(query)}"
    base_path += "&size=#{size}"
    path = append_catalog(base_path, catalog)
    process_api_request(:get, path)
  end

  # get a list of all available catalogs
  #
  # * *params*
  #   - +catalog+ (String) => HCA catalog name (optional)
  #   - +project_id+ (String) => UUID of HCA project
  #
  # * *returns*
  #   - (Hash) => Available catalogs, including :default_catalog
  #
  # * *raises*
  #   - (ArgumentError) => if catalog is not in self.all_catalogs
  def project(project_id, catalog: nil)
    base_path = "#{api_root}/index/projects/#{project_id}"
    path = append_catalog(base_path, catalog)
    process_api_request(:get, path)
  end

  # get a metadata TSV file for a given HCA project UUID
  #
  # * *params*
  #   - +catalog+ (String) => HCA catalog name (optional)
  #   - +project_id+ (UUID) => HCA project UUID
  #   - +format+ (string) => manifest file format, from MANIFEST_FORMATS
  #
  # * *returns*
  #   - (Hash) => Hash response including an HTTP status code and a location to download
  #
  # * *raises*
  #   - (ArgumentError) => if catalog is not in self.all_catalogs or format is not in MANIFEST_FORMATS
  def project_manifest_link(project_id, catalog: nil, format: 'compact')
    validate_manifest_format(format)

    base_path = "#{api_root}/fetch/manifest/files"
    project_filter = { 'projectId' => { 'is' => [project_id] } }
    filter_query = format_hash_as_query_string(project_filter)
    base_path += "?filters=#{filter_query}&format=#{format}"
    path = append_catalog(base_path, catalog)
    # since manifest files are generated on-demand, keep making requests until the Status code is 302 (Found)
    # Status 301 means that the manifest is still being generated; if no manifest is ready after 30s, return anyway
    time_slept = 0
    manifest_info = process_api_request(:get, path)
    while manifest_info['Status'] == 301
      break if time_slept >= MAX_MANIFEST_TIMEOUT

      interval = manifest_info['Retry-After']
      Rails.logger.info "Manifest still generating for #{project_id} (#{format}), retrying in #{interval}"
      sleep interval
      time_slept += interval
      manifest_info = process_api_request(:get, path)
    end
    manifest_info
  end

  # search for available files using facets/terms
  #
  # * *params*
  #   - +catalog+ (String) => HCA catalog name (optional)
  #   - +query+ (Hash) => query object from :format_query_object
  #   - +size+ (Integer) => number of results to return (default is 250)
  #
  # * *returns*
  #   - (Hash) => List of files matching query
  def files(catalog: nil, query: {}, size: MAX_RESULTS)
    base_path = "#{api_root}/index/files"
    query_string = format_hash_as_query_string(query)
    base_path += "?filters=#{query_string}&size=#{size}"
    path = append_catalog(base_path, catalog)
    # make API request, but fold in project information to each result so that this is preserved for later use
    raw_results = process_api_request(:get, path)['hits']
    results = []
    raw_results.each do |result|
      files = result['files']
      project = result['projects'].first
      project_info = {
        'projectShortname' => project['projectShortname'].first,
        'projectId' => project['projectId'].first
      }
      files.each do |file|
        results << file.merge(project_info)
      end
    end
    results
  end

  ##
  # helper methods
  ##

  # take a list of facets and construct a query object to pass as query string parameters when searching
  #
  # * *params*
  #   - +facets+ (Array<Hash>) => Array of search facet objects from SearchController#index
  #
  # * *returns*
  #   - (Hash) => Hash of query object to be fed to :format_hash_as_query_string
  def format_query_from_facets(facets = [])
    query = {}.with_indifferent_access
    facets.each do |facet|
      safe_facet = facet.with_indifferent_access
      hca_term = FacetNameConverter.convert_schema_column(:alexandria, :azul, safe_facet[:id])
      filter_values = safe_facet[:filters].map { |filter| filter[:name] }
      facet_query = { hca_term => { is: filter_values } }
      query.merge! facet_query
    end
    query
  end

  # create a regular expression to use in matching terms against project titles/descriptions or file attributes
  # returned regular expression is case-insensitive
  #
  # * *params*
  #   - +terms+ (Array<String>) => Array of search terms, can include quoted strings
  #
  # * *returns*
  #   - (Regexp) => regular expression used in matching (case-insensitive)
  def format_term_regex(terms = [])
    Regexp.new(terms.map { |t| Regexp.escape(t) }.join('|'), true)
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

  # append the HCA catalog name, if passed to a method
  #
  # * *params*
  #   - +api_path+ (String) => URL path for API request
  #   - +catalog+ (String) => name of HCA catalog
  #
  # * *returns*
  #   - (String) => URL path with catalog name appended, if present
  #
  # * *raises*
  #   - (ArgumentError) => if catalog is not in self.all_catalogs
  def append_catalog(api_path, catalog)
    return api_path unless catalog.present?

    validate_catalog_name(catalog)
    delimiter = api_path.include?('?') ? '&' : '?'
    "#{api_path}#{delimiter}catalog=#{catalog}"
  end

  private

  # validate that a catalog exists by checking the list of available public catalogs
  def validate_catalog_name(catalog)
    all_catalogs = catalogs['catalogs'].reject { |_, cat| cat['internal'] }.keys.sort
    unless all_catalogs.include?(catalog)
      error = ArgumentError.new("#{catalog} is not a valid catalog: #{all_catalogs.join(',')}")
      api_method = caller_locations[1]&.label # caller will be 2nd in stack, as first will be append_catalog
      ErrorTracker.report_exception(error, nil, { catalog: catalog, method: api_method })
      raise error
    end
  end

  # validate requested format is valid
  def validate_manifest_format(format)
    unless MANIFEST_FORMATS.include?(format)
      error = ArgumentError.new("#{format} is not a valid format: #{MANIFEST_FORMATS.join(',')}")
      api_method = caller_locations.first&.label
      ErrorTracker.report_exception(error, nil, { format: format, method: api_method })
      raise error
    end
  end
end
