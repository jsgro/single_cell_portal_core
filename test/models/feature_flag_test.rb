require 'test_helper'

class FeatureFlagTest < ActiveSupport::TestCase
  def setup
    @user = User.first
    @branding_group = BrandingGroup.first
    @feature_flag = FeatureFlag.find_or_create_by!(name: 'my_feature_flag')
    @featurable_map = {
        @user.class.name => @user,
        @branding_group.class.name => @branding_group
    }
  end

  test 'should implement feature flags for included classes' do
    puts "#{File.basename(__FILE__)}: '#{self.method_name}'"

    # use symbol instead of string to validate indifferent access
    flag_name = :my_feature_flag

    # test defaults
    @featurable_map.each do |class_name, instance|
      refute instance.feature_flags_with_defaults[flag_name],
             "Did not return false for #{class_name} instance default flag on #{flag_name}"
      refute class_name.constantize.feature_flag_for_instance(instance, flag_name),
             "Did not return false for #{class_name} class default flag on #{flag_name}"
    end

    @feature_flag.update(default_value: true)
    assert @feature_flag.default_value, "Did not update default value on #{@feature_flag.name} to true"

    # assert changes are global to all included classes & instances
    @featurable_map.each do |class_name, instance|
      assert instance.feature_flags_with_defaults[flag_name],
             "Did not return true for #{class_name} instance default flag on #{flag_name}"
      assert class_name.constantize.feature_flag_for_instance(instance, flag_name),
             "Did not return true for #{class_name} class default flag on #{flag_name}"
    end

    # assert locals override defaults
    @featurable_map.each do |class_name, instance|
      instance.feature_flags[flag_name] = false
      instance.save
      refute instance.feature_flags_with_defaults[flag_name],
             "Did not return false for #{class_name} instance override flag on #{flag_name}"
      refute class_name.constantize.feature_flag_for_instance(instance, flag_name),
             "Did not return false for #{class_name} class override flag on #{flag_name}"
    end

    puts "#{File.basename(__FILE__)}: '#{self.method_name}' successful!"
  end
end
