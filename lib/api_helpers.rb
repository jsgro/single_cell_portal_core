##
# helper methods for handing external API requests/responses
# should be used in other classes via include, e.g. `include ApiHelpers`
##
module ApiHelpers
  # max number of retries if should_retry? is true
  MAX_RETRY_COUNT = 5
  # interval for retry backoff on request retries
  RETRY_INTERVAL = Rails.env.test? ? 0 : 15

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

  # determine if a response is JSON
  #
  # * *params*
  #   - +content+ (String) => RestClient response body
  #
  # * *returns*
  #   - (Boolean) => indication if content is JSON
  def is_json?(content)
    begin
      !!JSON.parse(content)
    rescue
      false
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
end
