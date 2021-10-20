require "application_system_test_case"

describe "FeatureAnnouncements", :system do
  let(:feature_announcement) { feature_announcements(:one) }

  it "visiting the index" do
    visit feature_announcements_url
    assert_selector "h1", text: "Feature Announcements"
  end

  it "creating a Feature announcement" do
    visit feature_announcements_url
    click_on "New Feature Announcement"

    fill_in "Content", with: @feature_announcement.content
    fill_in "Doc link", with: @feature_announcement.doc_link
    check "Published" if @feature_announcement.published
    fill_in "Title", with: @feature_announcement.title
    click_on "Create Feature announcement"

    assert_text "Feature announcement was successfully created"
    click_on "Back"
  end

  it "updating a Feature announcement" do
    visit feature_announcements_url
    click_on "Edit", match: :first

    fill_in "Content", with: @feature_announcement.content
    fill_in "Doc link", with: @feature_announcement.doc_link
    check "Published" if @feature_announcement.published
    fill_in "Title", with: @feature_announcement.title
    click_on "Update Feature announcement"

    assert_text "Feature announcement was successfully updated"
    click_on "Back"
  end

  it "destroying a Feature announcement" do
    visit feature_announcements_url
    page.accept_confirm do
      click_on "Destroy", match: :first
    end

    assert_text "Feature announcement was successfully destroyed"
  end
end
