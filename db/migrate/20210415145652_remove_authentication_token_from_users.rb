class RemoveAuthenticationTokenFromUsers < Mongoid::Migration
  def self.up
    User.all.each {|user| user.unset(:authentication_token)}
  end

  def self.down
  end
end
