require 'api_test_helper'
require 'integration_test_helper'
require 'minitest/mock'
require 'test_helper'
require 'includes_helper'

class ProfilesControllerTest < ActionDispatch::IntegrationTest

  setup do
    @user = User.find_or_create_by(email: 'profile.test@gmail.com', password: 'password',
                                   password_confirmation: 'password', uid: '54321', registered_for_firecloud: false)
    TosAcceptance.create(email: @user.email)
    sign_in @user
    auth_as_user @user
  end

  teardown do
    User.find_by(email: 'profile.test@gmail.com').destroy
    TosAcceptance.find_by(email: 'profile.test@gmail.com').destroy
  end

  test 'should prevent updating Terra profile if not registered' do

    # use FireCloudProfile to help construct profile object
    profile = FireCloudProfile.new(
      contactEmail: @user.email,
      email: @user.email,
      firstName: 'John',
      lastName: 'Doe',
      institute: 'MIT',
      institutionalProgram: 'Biology',
      nonProfitStatus: 'true',
      pi: 'N/A',
      programLocationCity: 'Cambridge',
      programLocationState: 'MA',
      programLocationCountry: 'USA',
      title: 'researcher',
    )

    thurloe_mock = Minitest::Mock.new
    thurloe_mock.expect :services_available?, true, [String]
    ApplicationController.stub :firecloud_client, thurloe_mock do
      post update_user_firecloud_profile_path(@user.id, params: {fire_cloud_profile: profile.to_json})
      assert_redirected_to view_profile_path(@user.id)
      follow_redirect!
      thurloe_mock.verify

      # make sure user has not been registered
      @user.reload
      refute @user.registered_for_firecloud
    end
  end
end
