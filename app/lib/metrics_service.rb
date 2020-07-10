# Service to record events to Mixpanel via Bard
#
# Mixpanel is a business analytics service for tracking user interactions.
# Bard is a DSP service that mediates writes to Mixpanel.
#
# Most logging to Mixpanel is done in JavaScript (see metrics-api.js and
# scp-api-metrics.js in /app/javascript/lib/).  But some logging is done
# in Rails to make it easy to analyze metrics around long-running events
# triggered by user interactions -- like upload and ingest -- or events
# arround auth.

class MetricsService

  BARD_ROOT = Rails.application.config.bard_host_url

  IDENTIFY_PATH = BARD_ROOT + '/api/identify'
  EVENT_PATH = BARD_ROOT + '/api/event'

  # Merges unauth’d and auth’d user identities in Mixpanel via Bard
  #
  # To enable tracking users when they are signed in and not, Bard provides an
  # endpoint `/api/identify` to merge identities.  In SCP's case, the
  # anonynmous ID (`anonId`) is a random UUIDv4 string set as a cookie for all
  # users -- auth'd or not -- upon visiting SCP.

  # This call links that anonId to the user's bearer token used by DSP's Sam
  # service.  That bearer token is in turn linked to a deidentified
  # "distinct ID" used to track users across auth states in Mixpanel.
  def self.identify(user, cookies)

    Rails.logger.info "Merging user identity in Mixpanel via Bard"

    headers = {
      'Authorization' => "Bearer #{user.access_token['access_token']}",
      'Content-Type': 'application/json'
    }

    post_body = {'anonId': cookies['user_id']}.to_json

    params = {
      method: 'POST',
      url: IDENTIFY_PATH,
      headers: headers,
      payload: post_body
    }

    begin
      response = RestClient::Request.execute(params)
    rescue RestClient::ExceptionWithResponse => e
      Rails.logger.error "Bard error in call to #{bard_path}: #{e.message}"
      # Rails.logger.error e.to_yaml
      ErrorTracker.report_exception(e, user, params)
    end

  end

  # Log metrics to Mixpanel via Bard web service
  #
  # Bard docs:
  # https://terra-bard-prod.appspot.com/docs/
  #
  # @param {String} name Name of the event
  # @param {Hash} props Properties associated with the event
  def log(name, props = {})
    props.merge!({
      appId: 'single-cell-portal',
      timestamp: Time.now.in_milliseconds,
      env: Rails.env
    })

    post_body = {'anonId': cookies['user_id']}.to_json

  end
end
