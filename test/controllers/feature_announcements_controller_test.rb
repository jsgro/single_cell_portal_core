require 'test_helper'
require 'integration_test_helper'
require 'includes_helper'

class FeatureAnnouncementsControllerTest < ActionDispatch::IntegrationTest

  before(:all) do
    @today = Date.today.in_time_zone.strftime('%F')
    @feature_announcement = FeatureAnnouncement.create(
      title: 'New Feature Announcement',
      content: '<p>This is the content.</p>',
      doc_link: 'https://singlecell.zendesk.com/hc/en-us',
      published: true,
      archived: false
    )
    @admin = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    TosAcceptance.create(email: @admin.email)
    TosAcceptance.create(email: @user.email)
  end

  after(:all) do
    FeatureAnnouncement.destroy_all
  end

  setup do
    auth_as_user @admin
    sign_in @admin
  end

  teardown do
    OmniAuth.config.mock_auth[:google] = nil
    FeatureAnnouncement.update_all(published: true, archived: false)
  end

  test 'should get index' do
    get feature_announcements_path
    assert_response :success
    assert_select 'table#feature-announcements', 1
  end

  test 'should get new' do
    get new_feature_announcement_url
    assert_response :success
    assert_select 'form#feature-announcement', 1
  end

  test 'should create feature_announcement' do
    post feature_announcements_url, params: {
      feature_announcement: {
        content: '<p>This is new content.<p>',
        doc_link: 'https://singlecell.zendesk.com/hc/en-us',
        published: true,
        archived: false,
        title: 'Different Title'
      }
    }
    follow_redirect!
    assert_response :success
    assert FeatureAnnouncement.where(slug: "#{@today}-different-title").exists?
  end

  test 'should update feature_announcement' do
    updated_content = '<p>This content has changed.</p>'
    patch feature_announcement_url(@feature_announcement), params: {
      feature_announcement: {
        content: updated_content,
        doc_link: @feature_announcement.doc_link,
        published: @feature_announcement.published,
        archived: @feature_announcement.archived,
        title: @feature_announcement.title
      }
    }
    follow_redirect!
    assert_response :success
    @feature_announcement.reload
    assert_equal updated_content, @feature_announcement.content
  end

  test 'should destroy feature_announcement' do
    announcement = FeatureAnnouncement.create(
      title: 'Delete',
      content: '<p>Delete</p>',
      published: true,
      archived: false
    )
    delete feature_announcement_url(announcement)
    follow_redirect!
    assert_response :success
    assert_not FeatureAnnouncement.where(title: 'Delete').exists?
  end

  test 'should enforce admin credentials' do
    sign_out @admin
    sign_in @user
    auth_as_user @user
    get feature_announcements_path
    assert_redirected_to site_path
    get edit_feature_announcement_path(@feature_announcement)
    assert_redirected_to site_path
  end

  test 'should get view announcement page' do
    get view_feature_announcement_path(@feature_announcement.slug)
    assert_response :success
    assert_select 'div#feature-announcement-content', 1
  end

  test 'should get latest features page' do
    get latest_feature_announcements_path
    assert_response :success
    expected_count = FeatureAnnouncement.archived_features? ? 2 : 1
    assert_select 'ul.collections-list', expected_count
    assert_select 'li.feature-announcement-entry'
  end

  test 'should hide home page button if nothing published' do
    get site_path
    assert_response :success
    assert_select 'a#latest-features-btn', 1
    FeatureAnnouncement.update_all(published: false)
    get site_path
    assert_response :success
    assert_select 'a#latest-features-btn', false
  end
end
