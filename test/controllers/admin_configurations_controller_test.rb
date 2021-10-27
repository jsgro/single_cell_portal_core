require "integration_test_helper"

class AdminConfigurationsControllerTest < ActionDispatch::IntegrationTest
  # this test creates its own user since it needs to modify it as part of the test
  def setup
    @test_user = User.create!(email: 'test_flags_user@gmail.com',
                             password: 'password',
                             password_confirmation: 'password')
    # allow running this test in isolation w/o db/seeds.rb
    FeatureFlag.find_or_create_by!(name: 'convention_required', default_value: false)
  end

  def teardown
    User.find_by(email: 'test_flags_user@gmail.com').destroy
  end

  # as part of SCP-3621, this test is being commented out, but the scaffold left in place in case future feature flags
  # support opt in/out, in which case this test will be valid again
  test 'should process feature flag data correctly' do
    # @test_user.update!(feature_flags: {})
    #
    # AdminConfigurationsController.process_feature_flag_form_data(@test_user,
    #                                                              { feature_flag_convention_required: '1' })
    # assert_equal({ 'convention_required' => true }, @test_user.reload.feature_flags)
    #
    # AdminConfigurationsController.process_feature_flag_form_data(@test_user,
    #                                                              { feature_flag_convention_required: '0' })
    # assert_equal({ 'convention_required' => false }, @test_user.reload.feature_flags)
    #
    # AdminConfigurationsController.process_feature_flag_form_data(@test_user, { convention_required: '-' })
    # assert_equal({}, @test_user.reload.feature_flags)
  end
end
