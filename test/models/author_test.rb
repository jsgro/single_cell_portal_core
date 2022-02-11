require 'test_helper'

class AuthorTest < ActiveSupport::TestCase
  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Author Test',
                               user: @user,
                               test_array: @@studies_to_clean)
    @author = FactoryBot.create(:author, study: @study)
  end

  test 'should find corresponding authors for study' do
    assert_empty @study.authors.corresponding
    @author.update(corresponding: true)
    assert_includes @study.authors.corresponding, @author
  end
end
