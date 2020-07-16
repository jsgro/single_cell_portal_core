require "test_helper"

class MetricsServiceTest < ActiveSupport::TestCase

  test 'should log to Mixpanel via Bard' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    event = "ingest"
    props = {
      perfTime: 276322,
      fileType: "Cluster",
      fileSize: 680,
      action: "ingest_cluster",
      studyAccession: "SCP3",
      clusterType: "3d",
      numClusterPoints: 15,
      canSubsample: false,
      metadataFilePresent: false,
      appId: "single-cell-portal",
      timestamp: 1594820819674,
      env: "test",
      authenticated: true
    }

    user = User.new(access_token: {access_token: 'foo'})

     # Mock response from Bard, the DSP service mediating access to Mixpanel
     mock = Minitest::Mock.new
     mock.expect :code, 200

     RestClient::Request.stub :execute, mock do
      response = MetricsService.log(event, props, user)
      assert response.code, 200
      mock.verify
     end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
