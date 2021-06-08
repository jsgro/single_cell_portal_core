##
# API client bindings for retrieving information about Terra Data Repo datasets/snapshots/schemas from their API
##
class DataRepoClient < Struct.new(:access_token, :api_root, :storage, :expires_at, :service_account_credentials)
  extend ServiceAccountManager
  include GoogleServiceClient
  include ApiHelpers

  # Google authentication scopes necessary for querying TDR API
  GOOGLE_SCOPES = %w(openid email profile)
   # Base API URL to request against
  BASE_URL = Rails.application.config.tdr_api_base_url

  # control variables
  SORT_DIRECTIONS = %w(asc desc).freeze
  SORT_OPTIONS = %w(name description created_date).freeze
  DATASET_INCLUDE_FIELDS = %w(NONE SCHEMA ACCESS_INFORMATION PROFILE DATA_PROJECT STORAGE).freeze
  ALL_DATASET_FIELDS = %w(SCHEMA ACCESS_INFORMATION PROFILE DATA_PROJECT STORAGE).freeze

  ##
  # Constructors & token management methods
  ##

  # initialize is called after instantiating with DataRepoClient.new
  # will set the access token, TDR base API URL  root and GCP storage driver instance
  #
  # * *params*
  #   - +service_account_key+: (String, Pathname) => Path to service account JSON keyfile
  # * *return*
  #   - +DataRepoClient+ object
  def initialize(service_account=self.class.get_read_only_keyfile)
    # GCS storage driver attributes
    storage_attr = {
      project: self.class.compute_project,
      timeout: 3600,
      keyfile: service_account
    }

    self.service_account_credentials = service_account
    self.access_token = self.class.generate_access_token(service_account)
    self.storage = Google::Cloud::Storage.new(storage_attr)
    self.expires_at = Time.zone.now + self.access_token['expires_in']
    self.api_root = BASE_URL
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
      'Content-Type' => 'application/json',
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
      retry_time = retry_count * ApiHelpers::RETRY_INTERVAL
      sleep(retry_time)
      # only retry if status code indicates a possible temporary error, and we are under the retry limit and
      # not calling a method that is blocked from retries
      if should_retry?(e.http_code) && retry_count < ApiHelpers::MAX_RETRY_COUNT
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
  def get_datasets(direction: 'desc', filter: nil, limit: 100, offset: 0, sort: 'name')
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
  def get_dataset(dataset_id, include: ALL_DATASET_FIELDS)
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
  def get_snapshots(datasetIds: [], direction: 'desc', filter: nil, limit: 100, offset: 0, sort: 'name')
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
  def get_snapshot(snapshot_id)
    path = api_root + "/api/repository/v1/snapshots/#{snapshot_id}"
    process_api_request(:get, path)
  end

  # find all tables that pertain to files for a given snapshot
  #
  # * *params*
  #   - +snapshot_id+ (UUID) => Snapshot UUID
  #   - +file_id+ (String) => Snapshot file ID, usually a DRS ID
  #
  # * *returns*
  #   - (Array<Hash>) => Array of hashes of all tables/columns in a given snapshot that are file-based
  def get_snapshot_file(snapshot_id)
    path = api_root + "/api/repository/v1/snapshots/#{snapshot_id}/files/#{file_id}"
    process_api_request(:get, path)
  end

  ##
  # Query methods
  ##

  # query existing snapshot indexes to return denormalized row-level entries from the index
  #
  # * *params*
  #   - +query_json+ (String) => ElasticSearch DSL query string, from generate_query_from_facets
  #   - +limit+ (Integer) => limit on results returned, default: 1000
  #   - +offset+ (Integer) => offset row count on results, default: 0
  #   - +snapshot_ids+ (Array<UUID>) => restrict query to provided snapshots, default will query all available indexes
  #
  # * *returns*
  #   - (Array<Hash>) => Array of row-level results, with all columns present in index (there will be a lot of duplication)
  def query_snapshot_indexes(query_json, limit: 1000, offset: 0, snapshot_ids: [])
    query_opts = merge_query_options({limit: limit, offset: offset})
    path = api_root + '/api/repository/v1/search/query' + query_opts
    payload = {
      query: query_json.to_json, # extra JSON encoding needed here to escape quotes and other characters
      snapshotIds: snapshot_ids
    }.to_json
    process_api_request(:post, path, payload: payload)
  end

  # generate a query string in ElasticSearch query DSL
  # see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html for more information
  #
  # * *params*
  #   - +query_values+ (Hash) => Hash of query facets & filter values; supports strings, numbers, and ranges
  #                              e.g. {species: 'Homo sapiens', disease: 'tuberculosis, melanoma', organism_age: 18..35}
  #
  # * *returns*
  #   - (String) => String representation of query in ElasticSearch query DSL
  #                 e.g. "(species:Homo sapiens) AND (disease:tuberculosis OR disease:melanoma) AND (organism_age:18-35)"
  def generate_query_from_facets(query_values)
    formatted_elements = []
    query_values.each do |facet, filter_values|
      if filter_values.is_a? String
        filters = filter_values.split(',').map(&:strip)
      elsif filter_values.is_a? Numeric
        filters = [filter_values]
      elsif filter_values.is_a? Range
        filters = [filter_values.minmax.join('-')]
      end
      elements = filters.map {|filter| "#{facet}:#{filter}" }
      formatted_elements << "(#{elements.join(' OR ')})"
    end
    {query_string: {query: formatted_elements.join(' AND ')}}
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
