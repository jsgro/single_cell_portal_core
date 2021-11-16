require "integration_test_helper"

class BrandingGroupControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @admin = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    TosAcceptance.create(email: @admin.email)
    TosAcceptance.create(email: @user.email)
    @collection = FactoryBot.new(:branding_group, user_list: [@user])
  end

  after(:all) do
    @collection.destroy
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
  end

  test 'should show public collection list' do
    get collection_list_navigate_path
    assert_response :success
    assert_select 'ul.collections_list' do
      assert_select 'li', (1..)
    end
  end
end
