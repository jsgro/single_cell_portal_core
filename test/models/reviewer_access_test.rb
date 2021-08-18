require 'test_helper'

class ReviewerAccessTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Reviewer Access Test',
                               public: false,
                               test_array: @@studies_to_clean)
  end

  setup do
    # create a new ReviewerAccess for each test
    @access = @study.build_reviewer_access
    @access.save
  end

  teardown do
    ReviewerAccess.destroy_all
  end

  test 'should initialize reviewer access attributes' do
    assert @access.expires_at.is_a?(Date)
    assert @access.expires_at == 2.months.from_now.to_date # gotcha to discard timestamp info
    assert @access.access_code.present?
    assert_match ReviewerAccess::UUID_REGEX, @access.access_code
    assert @access.pin.present?
    assert_equal ReviewerAccess::PIN_LENGTH, @access.pin.length
    expected_cookie_name = "reviewer_session_#{@study.accession}".to_sym
    assert_equal expected_cookie_name, @access.cookie_name
  end

  test 'should authenticate via pin' do
    pin = @access.pin.dup
    assert @access.authenticate_pin?(pin)
    # test blank space handling
    assert @access.authenticate_pin?(" #{pin} ")
    refute @access.authenticate_pin?('foobar')
  end

  test 'should show expiration date' do
    assert @access.expiration_date.present?
    assert @access.expiration_date.is_a?(String)
  end

  test 'should prevent duplicate access in same study' do
    dup_access = @study.build_reviewer_access
    refute dup_access.valid?
    assert_equal :study_id, dup_access.errors.first.attribute
  end

  test 'should check expiration' do
    refute @access.expired?
    @access.update(expires_at: 1.day.ago)
    assert @access.expired?
  end

  test 'should rotate credentials' do
    original_access_code = @access.access_code.dup
    original_pin = @access.pin.dup
    @access.rotate_credentials!
    @access.reload
    assert_not_equal original_access_code, @access.access_code
    assert_not_equal original_pin, @access.pin
  end

  test 'should create new session' do
    session = @access.create_new_session
    assert session.persisted?
    assert session.session_key.present?
    assert_match ReviewerAccess::UUID_REGEX, session.session_key
  end

  test 'should enforce session expiration' do
    session = @access.create_new_session
    assert @access.session_valid?(session.session_key)
    session.update(expires_at: 1.minute.ago)
    session.reload
    refute @access.session_valid?(session.session_key)
  end

  test 'should clear all active sessions' do
    5.times { @access.create_new_session }
    assert_equal 5, @access.reviewer_access_sessions.count
    @access.clear_all_reviewer_sessions!
    assert_equal 0, @access.reviewer_access_sessions.count
  end
end
