class CreateFeatureFlagOptions < Mongoid::Migration
  def self.up
    [User, BrandingGroup].each do |model|
      model.all.each do |instance|
        instance.feature_flags.each do |flag_name, flag_value|
          feature_flag = FeatureFlag.find_by(name: flag_name)
          next if feature_flag.nil?

          flag_option = instance.feature_flag_options.build(feature_flag: feature_flag, value: flag_value)
          flag_option.save!
        end
      end
    end
  end

  def self.down
    FeatureFlagOption.delete_all
  end
end
