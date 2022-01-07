require 'integration_test_helper'
require 'test_helper'
require 'includes_helper'

class SiteControllerTest < ActionDispatch::IntegrationTest

  before(:all) do
    @user = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    @sharing_user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:study,
                               name_prefix: 'Site Controller Study',
                               public: true,
                               user: @user,
                               test_array: @@studies_to_clean,
                               predefined_file_types: %w[cluster metadata])
    detail = @study.build_study_detail
    detail.full_description = '<p>This is the description.</p>'
    detail.save!
  end

  def setup
    auth_as_user(@user)
    sign_in @user
  end

  def teardown
    OmniAuth.config.mock_auth[:google_oauth2] = nil
    # reset public permission
    @study.update(public: true)
  end

  test 'should redirect to home page from bare domain' do
    get '/'
    assert_response 302, "Did not receive correct HTTP status code, expected 302 but found #{status}"
    assert_redirected_to site_path, "Did not provide correct redirect, should have gone to #{site_path} but found #{path}"
    follow_redirect!
    assert_equal(site_path, path, "Redirect did not successfully complete, #{site_path} != #{path}")
  end

  test 'should redirect to correct study name url' do
    correct_study_url = view_study_path(accession: @study.accession, study_name: @study.url_safe_name)
    incorrect_study_url = view_study_path(accession: @study.accession, study_name: "bogus_name")
    get incorrect_study_url
    assert_response 302, 'Did not redirect to correct url'
    assert_redirected_to correct_study_url, 'Url did not redirected successfully'
    follow_redirect!
    assert_equal(correct_study_url, path, "Url is #{path}. Expected #{correct_study_url}")
  end

  test 'should create and delete deployment notification banner' do
    deployment_notification_params = {
      deployment_notification: {
        deployment_time: Time.zone.now,
        message: 'Testing deployment notification banner'
      }
    }

    post create_deployment_notification_path, params: deployment_notification_params, xhr: true
    get site_path
    assert_select '.notification-banner', 1,"Notification banner did not render to page"
    delete delete_deployment_notification_path
    follow_redirect!
    assert_response 200, 'Did not redirect successfully after banner was deleted'
    # Ensure page does not contain notification banner
    assert_select ".notification-banner", false, "Notification banner was not deleted and still is present on page."
  end

  test 'should control access to private studies' do
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name)
    assert_response :success

    # set to private, validate study owner/admin can still access
    @study.update(public: false)
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name)
    assert_response :success

    # negative tests
    sign_out(@user)
    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name)
    assert_response 302
    follow_redirect!
    assert_equal new_user_session_path, path

    auth_as_user(@sharing_user)
    sign_in @sharing_user

    get view_study_path(accession: @study.accession, study_name: @study.url_safe_name)
    assert_response 302
    follow_redirect!
    assert_equal site_path, path
  end

  test 'should control access to files in private studies' do
    file = @study.study_files.sample
    get download_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response 302
    # since this is an external redirect, we cannot call follow_redirect! but instead have to get the location header
    signed_url = response.headers['Location']
    assert signed_url.include?(file.upload_file_name), 'Redirect url does not point at requested file'

    # set to private, validate study owner/admin can still access
    # note that download_file_path and download_private_file_path both resolve to the same method and enforce the same
    # restrictions; both paths are preserved for legacy redirects from published papers
    @study.update(public: false)
    get download_private_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response 302
    signed_url = response.headers['Location']
    assert signed_url.include?(file.upload_file_name), 'Redirect url does not point at requested file'

    # negative tests
    sign_out(@user)
    get download_private_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response 302
    follow_redirect!
    assert_equal new_user_session_path, path, 'Did not redirect to sign in page'

    auth_as_user(@sharing_user)
    sign_in @sharing_user

    get download_private_file_path(accession: @study.accession, study_name: @study.url_safe_name, filename: file.upload_file_name)
    assert_response 302
    follow_redirect!
    assert_equal site_path, path, 'Did not redirect to home page'
  end
end
