class FeatureFlag

  ###
  #
  # FeatureFlag: stores global default values for feature flags
  #
  ###

  include Mongoid::Document

  field :name, type: String
  field :default_value, type: Boolean, default: false
  field :description, type: String

  # whether non-admin users can change the flag for themselves
  field :user_modifiable, type: Boolean, default: false

  # return a hash of name => default for all flags
  def self.default_flag_hash
    FeatureFlag.all.inject({}) do |hash, flag|
      hash[flag.name] = flag.default_value
      hash.with_indifferent_access
    end
  end
end
