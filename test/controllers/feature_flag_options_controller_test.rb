require 'test_helper'
require 'integration_test_helper'

class FeatureFlagOptionsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @admin = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    TosAcceptance.create(email: @admin.email)
    @feature_flag = FeatureFlag.find_or_create_by!(name: 'new_feature_flag', default_value: false)
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               user: @user,
                               name_prefix: 'Feature Flag Options Controller Test',
                               test_array: @@studies_to_clean)
    @branding_group = BrandingGroup.find_or_create_by!(
      name: 'Feature Flag Test', user_id: @user.id, font_family: 'Helvetica Neue, sans-serif',
      background_color: '#FFFFFF'
    )
    @featureable = [@user, @study, @branding_group]
  end

  setup do
    sign_in @admin
    auth_as_user @admin
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
    FeatureFlagOption.destroy_all
    @user.reload
    @study.reload
    @branding_group.reload
  end

  after(:all) do
    Study.where(name: 'Feature Flag Options Controller Test').destroy_all
    BrandingGroup.where(name: 'Feature Flag Test').destroy_all
    # delete all testing flags, except those needed by integration tests
    FeatureFlag.where(:name.nin => %w[convention_required raw_counts_required_backend]).destroy_all
  end

  test 'should get index' do
    get feature_flag_options_path
    assert_response :success
  end

  test 'should find feature flaggable instances' do
    @featureable.each do |instance|
      class_name = instance.class.name.underscore
      find_by = FeatureFlagOptionsController::SEARCH_ATTR_BY_MODEL[class_name].sample
      find_params = {
        class_name: class_name,
        attribute: find_by,
        value: instance.send(find_by)
      }
      post find_feature_flag_entity_path, params: find_params
      follow_redirect!
      assert_response :success
      expected_path = edit_feature_flag_option_path(class_name: class_name, id: instance.id)
      assert_equal expected_path, path
      assert_select 'div.feature-flag-options-field'
    end
    # invalid find params should redirect to index action
    bad_study_params = {
      class_name: 'study',
      attribute: 'accession',
      value: 'SCP12345'
    }
    bad_class_params = {
      class_name: 'foo',
      attribute: 'bar',
      value: 'bing'
    }
    [bad_study_params, bad_class_params].each do |invalid_params|
      post find_feature_flag_entity_path, params: invalid_params
      follow_redirect!
      assert_equal feature_flag_options_path, path
    end
  end

  test 'should update feature flag options for instances' do
    @featureable.each do |instance|
      class_name = instance.class.name.underscore
      get edit_feature_flag_option_path(class_name: class_name, id: instance.id)
      assert_response :success

      # because of how the forms are rendered and FeatureFlagOption instances are built, we need to
      # set an option first, otherwise we will get a "undefined method `update_attributes' for nil:NilClass"
      # error when processing this request, as the nested object IDs will be invalid as the objects were
      # re-instantiated on the form render
      instance.set_flag_option(@feature_flag.name, false)
      opt = instance.get_flag_option(@feature_flag.name)
      update_params = {
        class_name => {
          FeatureFlaggable::NESTED_FORM_KEY => {
            '0' => opt.form_attributes.merge({ value: true })
          }
        }
      }
      patch feature_flag_option_path(class_name: class_name, id: instance.id.to_s), params: update_params
      assert_redirected_to feature_flag_options_path
      instance.reload
      expected_flags = { @feature_flag.name.to_s => true }
      assert_equal expected_flags, instance.configured_feature_flags

      # now set back to default value
      update_params[class_name][FeatureFlaggable::NESTED_FORM_KEY]['0'][:value] = ''
      patch feature_flag_option_path(class_name: class_name, id: instance.id.to_s), params: update_params
      assert_redirected_to feature_flag_options_path
      instance.reload
      assert_empty instance.configured_feature_flags
    end
  end

  test 'should instantiate feature flaggable classes' do
    @featureable.each do |instance|
      class_name = instance.class.name.underscore
      flaggable_class = FeatureFlagOptionsController.instantiate_class(class_name)
      assert flaggable_class.present?
      assert flaggable_class.is_a?(Class)
    end
    assert_nil FeatureFlagOptionsController.instantiate_class('does_not_exist')
  end

  test 'should instantiate feature flaggable models' do
    @featureable.each do |instance|
      class_name = instance.class.name.underscore
      id = instance.id.to_s
      model_instance = FeatureFlagOptionsController.instantiate_model(class_name, id)
      assert_equal instance, model_instance
    end
  end
end
