require 'test_helper'

class FeatureAnnouncementTest< ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor
  include SelfCleaningSuite

  before(:all) do
    @feature_announcement = FeatureAnnouncement.create(
      title: 'Amazing New Feature',
      content: '<p>This is the content.</p>',
      doc_link: 'https://singlecell.zendesk.com/hc/en-us',
      published: true
    )
    @today = Date.today.in_time_zone.strftime('%F')
  end

  after(:all) do
    FeatureAnnouncement.destroy_all
  end

  teardown do
    FeatureAnnouncement.update_all(published: true)
  end

  test 'should set slug on save' do
    assert_equal "#{@today}-amazing-new-feature", @feature_announcement.slug
    @feature_announcement.update(title: 'Announcing a New Feature!!')
    @feature_announcement.reload
    assert_equal "#{@today}-announcing-a-new-feature", @feature_announcement.slug
  end

  test 'should determine if there are published features' do
    assert FeatureAnnouncement.published_features?
    FeatureAnnouncement.update_all(published: false)
    assert_not FeatureAnnouncement.published_features?
  end
end
