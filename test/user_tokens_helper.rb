# helper to restore user access tokens on test teardown to prevent successive downstream failures
def reset_user_tokens
  User.all.each do |user|
    token = {access_token: SecureRandom.uuid, expires_in: 3600, expires_at: Time.zone.now + 1.hour}
    user.update!(access_token: token, api_access_token: token)
    user.update_last_access_at!
  end
end
