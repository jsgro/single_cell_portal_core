class ClearOldTotats < Mongoid::Migration
  # mirror of FeatureFlag.rb, so this migration won't error if that class is renamed/altered
  class UserMigrator
    include Mongoid::Document
    store_in collection: 'users'
    field :totat_t_ti, type: String
    field :totat
  end

  def self.up
    UserMigrator.where(:totat.exists => true).each do |user|
      user.update(totat: nil, totat_t_ti: nil)
    end
  end

  def self.down
  end
end
