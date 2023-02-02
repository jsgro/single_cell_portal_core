require 'test_helper'

class FeatureFlagOptionTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @feature_flag = FeatureFlag.find_or_create_by!(name: 'options_testing')
  end

  after(:all) do
    FeatureFlag.where(name: 'validation_testing').destroy_all
  end

  teardown do
    FeatureFlagOption.destroy_all
    @feature_flag.update(enable_ab_test: false)
  end

  test 'should validate & persist feature_flag_option' do
    option = @user.feature_flag_options.build(feature_flag: @feature_flag)
    assert option.valid?
    option.save
    assert option.persisted?
    # ensure delegators work
    assert_equal @feature_flag.name, option.name
    assert_equal @feature_flag.default_value, option.default_value
    # ensure aliases work, and objects are in fact the same instance
    assert_equal @user, option.feature_flaggable
    assert_equal option.feature_flaggable, option.parent
  end

  test 'should enforce FeatureFlagOption validations' do
    # ensure feature flag exists
    option = @user.feature_flag_options.build
    assert_not option.valid?
    feature_flag = FeatureFlag.find_or_create_by!(name: 'validation_testing')
    option.feature_flag = feature_flag
    assert option.valid?
    option.save
    assert option.persisted?
    # ensure only one FeatureFlagOption can be saved per FeatureFlag & FeatureFlaggable instance
    new_option = @user.feature_flag_options.build(feature_flag: feature_flag)
    assert_not new_option.valid?
  end

  test 'should covert option to hash' do
    @user.set_flag_option(@feature_flag.name, true)
    option = @user.get_flag_option(@feature_flag.name)
    flag_as_hash = { @feature_flag.name => true }.with_indifferent_access
    assert_equal flag_as_hash, option.to_h
  end

  test 'should return sanitized form params' do
    @user.set_flag_option(@feature_flag.name, true)
    option = @user.get_flag_option(@feature_flag.name)
    expected_attributes = {
      id: option.id.to_s,
      name: option.name,
      value: option.value.to_s,
      feature_flaggable_type: 'User',
      feature_flaggable_id: @user.id.to_s
    }.with_indifferent_access
    assert_equal expected_attributes, option.form_attributes
  end

  test 'should remove user from A/B test if override is present' do
    @feature_flag.update(enable_ab_test: true)
    sessions = FeatureFlag.load_ab_test_sessions(@user.metrics_uuid)
    assert_equal 1, sessions.size
    @user.set_flag_option(@feature_flag.name, true)
    assert_empty FeatureFlag.load_ab_test_sessions(@user.metrics_uuid)
  end
end
