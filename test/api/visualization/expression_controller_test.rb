require 'test_helper'
require 'api_test_helper'

class ExpressionControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Basic Expression Study',
                                     public: false,
                                     user: @user,
                                     test_array: @@studies_to_clean)
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
  end

  test 'methods should check view permissions' do
    user2 = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    sign_in_and_update user2

    execute_http_request(:get, api_v1_study_expression_path(@basic_study, 'heatmap'), user: user2)
    assert_equal 403, response.status

    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_expression_path(@basic_study, 'heatmap'), user: @user)
    assert_equal 400, response.status # response is 400 since study is non-visualizable
  end
end
