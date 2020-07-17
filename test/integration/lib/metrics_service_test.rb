require "test_helper"

class MetricsServiceTest < ActiveSupport::TestCase

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
      authenticated: true
    })

    # As input into RestClient::Request.execute.
    # These expected arguments are the main thing we are testing.
    expected_args = {
      :url=>"https://terra-bard-dev.appspot.com/api/event",
      :headers=>{:Authorization=>"Bearer ", :"Content-Type"=>"application/json"},
      :payload=>{event: event, properties: expected_output_props}.to_json,
      :method=>"POST"
    }

    # A high-fidelity test double
    user = User.new(access_token: {access_token: 'foo'})

    # Mock network traffic to/from Bard, the DSP service proxying Mixpanel
    mock = Minitest::Mock.new
    mock.expect :call, mock, [expected_args] # Mock request
    mock.expect :code, 200 # Mock response

     RestClient::Request.stub :execute, mock do
      response = MetricsService.log(event, input_props, user)
      assert response.code, 200
      mock.verify
     end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
