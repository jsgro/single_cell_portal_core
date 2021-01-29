require "test_helper"

class MetricsServiceTest < ActiveSupport::TestCase

  setup do
    @user = User.create(
        email: 'bard.user@gmail.com',
        password: 'password',
        uid: '99999',
        access_token: {
            access_token: 'foo',
            expires_at: DateTime.new(3000, 1, 1),
            expires_in: 3600
        },
        registered_for_firecloud: true
    )
  end

  teardown do
    User.find_by(email: 'bard.user@gmail.com').destroy
  end

  test 'should log to Mixpanel via Bard' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    event = "ingest"

    # As input into MetricsService.log from e.g. IngestJob.get_email_and_log_to_mixpanel
    input_props = {
      perfTime: 276322,
      fileType: "Cluster",
      fileSize: 680,
      action: "ingest_cluster",
      studyAccession: "SCP3",
      clusterType: "3d",
      numClusterPoints: 15,
      canSubsample: false,
      metadataFilePresent: false
    }

    # As passed from MetricsService.log to MetricsService.post_to_bard
    # Would be handy if we ever want to test that boundary.
    expected_output_props = input_props.merge({
      appId: "single-cell-portal",
      env: "test",
      registeredForTerra: true,
      authenticated: true
    })

    # As input into RestClient::Request.execute.
    # These expected arguments are the main thing we are testing.
    expected_args = {
      url: "https://terra-bard-dev.appspot.com/api/event",
      headers: {:Authorization=>"Bearer ", :"Content-Type"=>"application/json"},
      payload: {event: event, properties: expected_output_props}.to_json,
      method: "POST"
    }

    # Mock network traffic to/from Bard, the DSP service proxying Mixpanel
    mock = Minitest::Mock.new
    mock.expect :call, mock, [expected_args] # Mock `execute` call (request)

    RestClient::Request.stub :execute, mock do
      MetricsService.log(event, input_props, @user)
      mock.verify
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should post expected data to Mixpanel `identify` endpoint' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    cookies = {
      user_id: '168d8f62-f813-4e45-61d7-b81afe29642a' # Random UUIDv4 string
    }.with_indifferent_access
    anon_id = cookies['user_id']

    # As input into RestClient::Request.execute.
    # These expected arguments are the main thing we are testing.
    expected_args = {
      url: "https://terra-bard-dev.appspot.com/api/identify",
      headers: {Authorization: "Bearer ", "Content-Type": "application/json"},
      payload: {anonId: anon_id}.to_json,
      method: "POST"
    }

    # Mock network traffic to/from Bard, the DSP service proxying Mixpanel
    mock = Minitest::Mock.new
    mock.expect :call, mock, [expected_args] # Mock `execute` call (request)

    RestClient::Request.stub :execute, mock do
      MetricsService.merge_identities_in_mixpanel(@user, cookies)
      mock.verify
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should report errors to mixpanel' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    request_parameters = { 'controller' => 'site', 'action' => 'index'}
    fullpath = '/single_cell'
    user_id = SecureRandom.uuid

    # mock environment for request object (sets necessary values for MetricsService.report_error)
    env = {
      'rack.request.cookie_hash' => {
        user_id: user_id
      },
      'rack.input' => {},
      'action_dispatch.request.path_parameters' => request_parameters,
      'PATH_INFO' => fullpath
    }.with_indifferent_access

    request = ActionDispatch::Request.new(env)
    error = StandardError.new('this is the error message')

    expected_output_props = {
      requestPath: fullpath,
      controllerName: request_parameters['controller'],
      actionName: request_parameters['action'],
      errorClass: error.class.name,
      errorMessage: error.message,
      appId: 'single-cell-portal',
      env: Rails.env,
      authenticated: false,
      distinct_id: user_id
    }.with_indifferent_access

    expected_args = {
      url: 'https://terra-bard-dev.appspot.com/api/event',
      headers: {'Content-Type': 'application/json'},
      payload: {event: 'server-error', properties: expected_output_props}.to_json,
      method: 'POST'
    }

    mock = Minitest::Mock.new
    mock.expect :call, mock, [expected_args]

    RestClient::Request.stub :execute, mock do
      MetricsService.report_error(error, request)
      mock.verify
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
