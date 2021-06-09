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
  BASE_URL = Rails.application.config.tdr_api_base_url.freeze
  # Hostname of repo, needed for parsing out DRS identifiers
  REPOSITORY_HOSTNAME = URI(BASE_URL).host.freeze
  # prefix used to identify valid DRS ids
  DRS_PREFIX = "drs://#{REPOSITORY_HOSTNAME}/".freeze

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
  # Status
  ##

  # get more detailed status information about TDR API
  # this method doesn't use process_api_request as we want to preserve error states rather than catch and suppress them
  #
  # * *return*
  #   - +Hash+ with health status information for various TDR services or error response
  def api_status
    path = self.api_root + '/status'
    # make sure access token is still valid
    headers = {
      'Authorization' => "Bearer #{self.valid_access_token['access_token']}",
      'Accept' => 'application/json',
      'Content-Type' => 'application/json',
      'x-app-id' => "single-cell-portal",
      'x-domain-id' => "#{ENV['HOSTNAME']}"
    }
    begin
      response = RestClient::Request.execute(method: :get, url: path, headers: headers)
      JSON.parse(response.body)
    rescue RestClient::ExceptionWithResponse => e
      Rails.logger.error "Terra Data Repo status error: #{e.message}"
      e.response
    end
  end

  # determine if TDR API is currently up/available
  #
  # * *return*
  #   - +Boolean+ indication of TDR current root status
  def api_available?
    begin
      response = self.api_status
      response.is_a?(Hash) && response['ok']
    rescue => e
      false
    end
  end

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
  #   - +file_id+ (String) => Snapshot file ID, usually the last UUID component from a DRS ID
  #
  # * *returns*
  #   - (Hash) => Hash detail of file object with path/size/checksum info, and a fileDetail object with a gs accessUrl
  def get_snapshot_file_info(snapshot_id, file_id)
    path = api_root + "/api/repository/v1/snapshots/#{snapshot_id}/files/#{file_id}"
    process_api_request(:get, path)
  end

  ##
  # Query methods
  ##

  # query existing snapshot indexes to return denormalized row-level entries from the index
  #
  # * *params*
  #   - +query_json+ (String) => ElasticSearch DSL query string, from DataRepoClient#generate_query_from_facets
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
      query: query_json.to_json, # extra JSON encoding needed here to escape quotes and other control characters
      snapshotIds: snapshot_ids
    }.to_json
    process_api_request(:post, path, payload: payload)
  end

  # generate a query string in ElasticSearch query DSL
  # see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html for more information
  #
  # * *params*
  #   - +selected_facets+ (Array<Hash>) => Array of hashes representing query facets & filter values, passed from Api::V1::SearchController#index
  #                              e.g. [{id: :species, filters: [{id: 'NCBITaxon9609', name: 'Homo sapiens'}]},
  #                                    {id: :disease, filters: [{id: 'MONDO_0018076', name: 'tuberculosis', },
  #                                    {id: 'MONDO_0005105', name: 'melanoma'}]}]
  #
  # * *returns*
  #   - (Hash) => Hash representation of query in ElasticSearch query DSL (must be cast to JSON for use in DataRepoClient#query_snapshot_indexes)
  #                 e.g. "{:query_string=>{:query=>"(species:NCBITaxon9609 OR species:Homo sapiens) AND
  #                         (disease:MONDO_0018076 OR disease:tuberculosis OR disease:MONDO_0005105 OR disease:melanoma)"}}"
  def generate_query_from_facets(selected_facets)
    formatted_elements = []
    selected_facets.each do |search_facet|
      facet = search_facet[:id]
      if search_facet[:filters].is_a? Hash # this is a numeric facet w/ min/max/unit
        filters = ["#{search_facet.dig(:filters, :min)}-#{search_facet.dig(:filters, :max)}"]
      else
        filters = search_facet[:filters].map(&:values).flatten
      end
      elements = filters.map {|filter| "#{facet}:#{filter}" }
      formatted_elements << "(#{elements.join(' OR ')})"
    end
    {query_string: {query: formatted_elements.join(' AND ')}}
  end

  ##
  # DRS File methods
  ##

  # get a file using a DRS identifier
  #
  # * *params*
  #   - +drs_id+ (String) => A DRS idenfifier, formatted as drs://[repository_hostname]/v1_[collection_id]_[file_id], where
  #                          [repository_hostname] is a domain name, e.g. jade.datarepo-dev.broadinstitute.org,
  #                          [collection_id] is a UUID of a collection, and
  #                          [file_id] is a UUID of a file object, e.g:
  #                          drs://jade.datarepo-dev.broadinstitute.org/v1_fcaee9e0-4745-4006-9718-7d048a846d96_5009a1f8-c2ee-4ceb-8ddb-40c3ddee5472
  #
  # * *returns*
  #   - (Hash) => Hash detail of file object with path/size/checksum info, and a fileDetail object with a gs accessUrl
  #
  # * *raises*
  #   - (ArgumentError) => if drs_id is not formatted correctly
  def get_drs_file_info(drs_id)
    formatted_id = parse_drs_id(drs_id)
    path = api_root + '/ga4gh/drs/v1/objects/' + formatted_id
    process_api_request(:get, path)
  end

  # get back a GS url from a DRS file id
  #
  # * *params*
  #   - +drs_id+ (String) => A DRS identifier, formatted as drs://[repository_hostname]/v1_[collection_id]_[file_id]
  #
  # * *returns*
  #   - (String) => a GS url pointing to a file in a bucket
  #
  # * *raises*
  #   - (ArgumentError) => if drs_id is not formatted correctly
  def get_gs_url_from_drs_id(drs_id)
    file_info = get_drs_file_info(drs_id)
    gs_info = file_info.dig('access_methods').detect {|access| access.dig('type') == 'gs'}
    if gs_info.present?
      gs_info.dig('access_url', 'url')
    else
      nil
    end
  end

  # parse a DRS identifier into a usable ID for DataRepoClient#get_drs_file_info
  #
  # * *params*
  #   - +drs_id+ (String) => A DRS identifier, formatted as drs://[repository_hostname]/v1_[collection_id]_[file_id]
  #
  # * *returns*
  #   - (String) => an identifier to be used in DataRepoClient#get_drs_file_info
  #
  # * *raises*
  #   - (ArgumentError) => if drs_id is not formatted correctly
  def parse_drs_id(drs_id)
    raise ArgumentError.new("#{drs_id} is not a valid DRS id") unless drs_id.starts_with?(DRS_PREFIX)
    drs_id.split(DRS_PREFIX).last
  end

  ##
  # GCS File methods
  # NOTE: these currently will not work due to access controls on TDR buckets. leaving for now in case this is resolved,
  # but they may end up being removed in favor of other tooling such as gsutil
  ##

  # retrieve a workspace's GCP bucket
  #
  # * *params*
  #   - +bucket_id+ (String) => ID of workspace GCP bucket
  #
  # * *return*
  #   - +Google::Cloud::Storage::Bucket+ object
  def get_bucket(bucket_id)
    self.storage.bucket bucket_id
  end

  # retrieve single study_file in a GCP bucket of a workspace
  #
  # * *params*
  #   - +bucket_id+ (String) => ID of workspace GCP bucket
  #   - +filename+ (String) => name of file
  #
  # * *return*
  #   - +Google::Cloud::Storage::File+
  def get_bucket_file(bucket_id, filename)
    bucket = self.get_bucket(bucket_id)
    bucket.file filename
  end

  # get a remote GCS file from a DRS id
  #
  # * *params*
  #   - +drs_id+ (String) => A DRS identifier, formatted as drs://[repository_hostname]/v1_[collection_id]_[file_id]
  #
  # * *return*
  #   - +Google::Cloud::Storage::Bucket+ object
  #
  # * *raises*
  #   - (ArgumentError) => if drs_id is not formatted correctly
  def get_bucket_file_from_drs_id(drs_id)
    gs_url = get_gs_url_from_drs_id(drs_id)
    gs_info = parse_gs_url(gs_url)
    get_bucket_file(gs_info[:bucket_id], gs_info[:filepath])
  end

  # parse a GS URL into a bucket_id and filepath
  #
  # * *params*
  #   - +gs_url+ GS url to file in TDR bucket, e.g. gs://bucket_name/path/to/file.txt
  #
  # * *returns*
  #   - (Hash) => Hash of file info => {bucket_id: id, filepath: filepath}
  #
  # * *raises*
  #   - (ArgumentError) => if gs_url is not formatted correctly
  def parse_gs_url(gs_url)
    raise ArgumentError.new("#{gs_url} is not a valid GS URL") unless gs_url.starts_with?('gs://')
    url_parts = gs_url.split('gs://').last.split('/')
    bucket_id = url_parts.slice!(0)
    filepath = url_parts.join('/')
    {bucket_id: bucket_id, filepath: filepath}
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
