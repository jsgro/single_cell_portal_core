require 'test_helper'

class PublicationTest < ActiveSupport::TestCase
  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Publication Test',
                               user: @user,
                               test_array: @@studies_to_clean)
    @publication = FactoryBot.create(:publication, study: @study, preprint: true)
  end

  test 'should generate PMC link' do
    assert @publication.pmc_link.present?
    assert @publication.pmc_link.include? @publication.pmcid
  end

  test 'should find all published publications for study' do
    assert_empty @study.publications.published
    @publication.update(preprint: false)
    assert_includes @study.publications.published, @publication
  end
end
