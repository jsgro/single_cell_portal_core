class ClearOldTotats < Mongoid::Migration
  def self.up
    User.where(:totat.exists => true).each do |user|
      user.update(totat: nil, totat_t_ti: nil)
    end
  end

  def self.down
  end
end
