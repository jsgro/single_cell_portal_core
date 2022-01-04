require 'test_helper'

class BigQueryClientTest < ActiveSupport::TestCase
  include TestInstrumentor

  test 'should instantiate client and assign attributes' do
    @bq = BigQueryClient.new
    assert_not_nil @bq
    assert_not_nil @bq.client
    assert_equal @bq.project, ENV['GOOGLE_CLOUD_PROJECT']
    assert_equal @bq.service_account_credentials, ENV['SERVICE_ACCOUNT_KEY']
  end
end
