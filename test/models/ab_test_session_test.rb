require 'test_helper'

class AbTestSessionTest < ActiveSupport::TestCase

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @feature_flag = FeatureFlag.find_or_create_by!(name: 'explore_tab_default')
    @session = AbTestSession.create(feature_flag: @feature_flag, user: @user)
  end

  after(:all) do
    @feature_flag.destroy
  end

  test 'should only create one session per flag per user' do
    assert_equal @user.metrics_uuid, @session.metrics_uuid
    assert_equal @user.id, @session.user.id
    assert_raise Mongoid::Errors::Validations do
      AbTestSession.create!(feature_flag: @feature_flag, metrics_uuid: @user.metrics_uuid)
    end
  end

  # we can't prove true random assignment, only that over a reasonable amount of iterations we would see a roughly
  # equal distribution (±2%); for reference, SCP had ~2.5K unique Study overview events/week in 2022
  test 'should distribute group assignments equally' do
    groups = []
    n = 2_500
    distribution = (0.48..0.52)
    n.times do
      groups << AbTestSession.random_group
    end
    AbTestSession::GROUP_NAMES.map do |group|
      percentage = groups.tally[group] / n.to_f
      assert distribution.include?(percentage), "#{group}: #{percentage} was outside the ±2% distribution"
    end
  end

  test 'should set session tag' do
    expected_name = "explore-tab-default-group-#{@session.group_name}"
    assert_equal expected_name, @session.session_tag
  end
end
