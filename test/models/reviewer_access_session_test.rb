require 'test_helper'

class ReviewerAccessSessionTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  UUID_REGEX = %r{[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}}.freeze

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Reviewer Access Session Test',
                               public: false,
                               test_array: @@studies_to_clean)
    @access = @study.build_reviewer_access
    @access.save!
  end

  setup do
    @session = @access.create_new_session
  end

  teardown do
    @access.clear_all_reviewer_sessions!
  end

  test 'should initialize session' do
    assert @session.persisted?
    assert @session.session_key.present?
    assert_match UUID_REGEX, @session.session_key
  end

  test 'should show expiration date' do
    assert @session.expiration_time.present?
    assert @session.expiration_time.is_a?(String)
  end

  test 'should enforce expiration' do
    refute @session.expired?
    @session.update(expires_at: 1.minute.ago)
    @session.reload
    assert @session.expired?
  end

  test 'should show duration label' do
    label = ReviewerAccessSession.session_duration_label
    assert label.is_a?(String)
    assert_equal '4 hours', label
  end
end
