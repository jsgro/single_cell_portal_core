class ClearUserAuthTokens < Mongoid::Migration
  def self.up
    # clear user tokens one last time in preparation for storing refresh tokens indefinitely
    User.update_all(refresh_token: nil, access_token: nil, api_access_token: nil)
  end

  def self.down
  end
end
