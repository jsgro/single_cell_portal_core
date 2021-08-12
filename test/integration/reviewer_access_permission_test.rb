require 'test_helper'
require 'integration_test_helper'

class ReviewerAccessPermissionTest < ActionDispatch::IntegrationTest
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor
  include Devise::Test::IntegrationHelpers

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:study,
                               name_prefix: 'Reviewer Access Test', public: false, test_array: @@studies_to_clean)
    detail = @study.build_study_detail
    detail.update(full_description: "<p>testing</p>")
    TosAcceptance.find_or_create_by!(email: @user.email)
  end

  teardown do
    ReviewerAccessSession.destroy_all
    ReviewerAccess.destroy_all
    OmniAuth.config.mock_auth[:google] = nil
  end

  test 'should create reviewer access' do
    auth_as_user(@user)
    sign_in @user
    reviewer_access_params = {
      study: {
        reviewer_access_attributes: {
          expires_at: 2.months.from_now.to_date.to_s
        }
      },
      reviewer_opts: {
        enable: 'yes'
      }
    }

    post update_study_settings_path(accession: @study.accession, study_name: @study.url_safe_name),
         params: reviewer_access_params, xhr: true
    assert_response :success
    @study.reload
    access = @study.reviewer_access
    assert access.present?
    get reviewer_access_path(access_code: access.access_code)
    assert_response :success
  end

  test 'should create new reviewer access session' do
    access = @study.build_reviewer_access
    access.save!
    access_params = { reviewer_access: { pin: access.pin } }
    post validate_reviewer_access_path(access_code: access.access_code), params: access_params
    follow_redirect!
    assert_response :success
    access.reload
    assert access.reviewer_access_sessions.any?
    session = access.reviewer_access_sessions.first
    expected_path = view_study_path(accession: @study.accession, study_name: @study.url_safe_name,
                                    reviewerSession: session.session_key)
    assert_equal request.fullpath, expected_path
  end

  test 'should invalidate reviewer access sessions' do
    access = @study.build_reviewer_access
    access.save!
    session = access.create_new_session
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name,
                        reviewerSession: session.session_key)
    assert_response :success
    auth_as_user(@user)
    sign_in @user
    reviewer_access_params = {
      study: {
        reviewer_access_attributes: {
          expires_at: 2.months.from_now.to_date.to_s
        }
      },
      reviewer_opts: {
        enable: 'no'
      }
    }
    post update_study_settings_path(accession: @study.accession, study_name: @study.url_safe_name),
         params: reviewer_access_params, xhr: true
    assert_response :success
    @study.reload
    refute @study.reviewer_access.present?
    sign_out @user
    OmniAuth.config.mock_auth[:google] = nil # gotcha to clear any cached auth responses
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name,
                        reviewerSession: session.session_key)
    assert_redirected_to site_path
  end

  test 'should rotate credentials and invalidate reviewer access sessions' do
    access = @study.build_reviewer_access
    access.save!
    original_access_code = access.access_code.dup
    original_pin = access.pin.dup
    get reviewer_access_path(access_code: access.access_code)
    assert_response :success
    session = access.create_new_session
    original_session_key = session.session_key
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name,
                        reviewerSession: original_session_key)
    assert_response :success
    auth_as_user(@user)
    sign_in @user
    reviewer_access_params = {
      study: {
        reviewer_access_attributes: {
          expires_at: 2.months.from_now.to_date.to_s
        }
      },
      reviewer_opts: {
        reset: 'yes'
      }
    }
    post update_study_settings_path(accession: @study.accession, study_name: @study.url_safe_name),
         params: reviewer_access_params, xhr: true
    assert_response :success
    @study.reload
    access.reload
    assert_not_equal original_access_code, access.access_code
    assert_not_equal original_pin, access.pin
    refute access.reviewer_access_sessions.any?
    sign_out @user
    OmniAuth.config.mock_auth[:google] = nil # gotcha to clear any cached auth responses
    get reviewer_access_path(access_code: original_access_code)
    assert_redirected_to site_path
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name,
                        reviewerSession: original_session_key)
    assert_redirected_to site_path
    get reviewer_access_path(access_code: access.access_code)
    assert_response :success
  end
end
