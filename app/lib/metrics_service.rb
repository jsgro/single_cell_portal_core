# Service to record events to Mixpanel via Bard
#
# Mixpanel is a business analytics service for tracking user interactions.
# Bard is a DSP service that mediates writes to Mixpanel.
#
# Most logging to Mixpanel is done in JavaScript; see metrics-api.js and
# scp-api-metrics.js in /app/javascript/lib/.  But some logging is done
# in Rails to make it easy to analyze metrics around long-running events
# triggered by user interactions -- like upload and ingest -- or special
# identity resolution.

class MetricsService

  BARD_ROOT = Rails.application.config.bard_host_url

  def self.post_to_bard(params, user)
    params.merge!({
      method: 'POST'
    })
    begin
      Rails.logger.info "Posting to Mixpanel.  Params: #{params}"
      response = RestClient::Request.execute(params)
    rescue RestClient::ExceptionWithResponse => e
      Rails.logger.error "Bard error in call to #{params[:url]}: #{e.message}"
      # Rails.logger.error e.to_yaml
      ErrorTracker.report_exception(e, user, params)
    end
  end

  def self.get_default_headers(user)
    return {
      'Authorization': "Bearer #{user.access_token['access_token']}",
      'Content-Type': 'application/json'
    }
  end

  # Merges unauth’d and auth’d user identities in Mixpanel via Bard
  #
  # To enable tracking users when they are signed in and not, Bard provides an
  # endpoint `/api/identify` to merge identities.  In SCP's case, the
  # anonynmous ID (`anonId`) is a random UUIDv4 string set as a cookie for all
  # users -- auth'd or not -- upon visiting SCP.

  # This call links that anonId to the user's bearer token used by DSP's Sam
  # service.  That bearer token is in turn linked to a deidentified
  # "distinct ID" used to track users across auth states in Mixpanel.
  def self.identify(user)

    Rails.logger.info "Merging user identity in Mixpanel via Bard"

    headers = get_default_headers(user)

    post_body = {'anonId': user.id}.to_json

    params = {
      url: BARD_ROOT + '/api/identify',
      headers: headers,
      payload: post_body
    }

    self.post_to_bard(params, user)

  end

  # Log metrics to Mixpanel via Bard web service
  #
  # Bard docs:
  # https://terra-bard-prod.appspot.com/docs/
  #
  # @param {String} name Name of the event
  # @param {Hash} props Properties associated with the event
  def self.log(name, props = {}, user)
    Rails.logger.info "Logging analytics to Mixpanel for event name: #{name}"

    props.merge!({
      appId: 'single-cell-portal',
      env: Rails.env
    })

    access_token = user.access_token['access_token']
    user_id = user.id

    headers = get_default_headers(user)

    if access_token === ''
      # User is unauthenticated / unregistered / anonynmous
      props['distinct_id'] = userId
      headers.delete('Authorization')
      props['authenticated'] = false
    else
      props['authenticated'] = true
    end

    post_body = {'event': name, 'properties': props}.to_json

    params = {
      url: BARD_ROOT + '/api/event',
      headers: headers,
      payload: post_body
    }

    self.post_to_bard(params, user)

  end
end
