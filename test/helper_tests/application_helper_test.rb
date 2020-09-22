require 'test_helper'


class ApplicationHelperTest < ActionView::TestCase

  test 'should retrieve access token' do
    user = User.first
    # store access token to restore later
    access_token_hash = user.access_token
    client_access_token = get_user_access_token(user)
    expected_token = access_token_hash.dig(:access_token)
    assert_equal expected_token, client_access_token,
                 "Access tokens do not match; #{expected_token} != #{client_access_token}"
    refute client_access_token.nil?, "Should have retrieved a value for access token"

    # simulate issue with access token retrieval by clearing values
    user.update(access_token: nil)
    user.reload
    new_token = get_user_access_token(user)
    assert new_token.nil?, "Access token should be nil, but found #{new_token}"

    # clean up and ensure consistency
    user.update(access_token: access_token_hash)
    user.reload
    assert_equal user.access_token, access_token_hash,
                 "Restore did not complete successfully; #{user.access_token} != #{access_token_hash}"
  end
end
