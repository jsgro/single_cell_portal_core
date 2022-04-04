# Add functionality for supporting "feature_flags" for a given model, used to turn on/off special features in a
# sandboxed fashion
#
# To make any model "FeatureFlaggable", add <code>include FeatureFlaggable</code> to the top of the class declaration
# after the Mongoid includes:
#
#  class MyNewClass
#    include Mongoid::Document
#    include Mongoid::Timestamps
#    include FeatureFlaggable
#
#    field :some_attribute_name, type: String
#    field :some_other_attribute, type: String
#    ...
module FeatureFlaggable
  extend ActiveSupport::Concern

  # form key for managing default values
  NESTED_FORM_KEY = :feature_flag_options_attributes

  # associations via FeatureFlagOptions model
  included do
    has_many :feature_flag_options, as: :feature_flaggable, dependent: :delete_all
    accepts_nested_attributes_for :feature_flag_options,
                                  allow_destroy: true
  end

  # get specific feature_flag_option value for this instance
  # will fall back to default_value of parent FeatureFlag if no feature_flag_option is present
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #
  # * *returns*
  #   - (Boolean, Nilclass) => T/F if set, nil if no configured option or flag does not exist
  def feature_flag_for(flag_name)
    opt = get_flag_option(flag_name)
    opt.present? ? opt.value : FeatureFlag.find_by(name: flag_name)&.default_value
  end

  # return feature flag as Hash, with name & value for this instance
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #
  # * *returns*
  #   - (Hash, Nilclass) => Hash of flag, merging in default value, or nil if flag does not exist
  def feature_flag_as_hash(flag_name)
    if FeatureFlag.where(name: flag_name).exists?
      {
        flag_name.to_s => feature_flag_for(flag_name)
      }.with_indifferent_access
    end
  end

  # return requested feature_flag_option values for this instance
  # will supply defaults if not configured
  #
  # * *params*
  #   - +flag_names+ (Array<String>) => Array of feature flag names
  #
  # * *returns*
  #   - (Hash) => Hash of requested feature flags (if present)
  def feature_flags_for(*flag_names)
    flag_names.map { |flag_name| feature_flag_as_hash(flag_name) }.reduce({}, :merge).with_indifferent_access
  end

  # return only configured feature_flag_options for this instance
  # will not interpolate defaults - only returns configured values
  #
  # * *returns*
  #   - (Hash) => Hash of all configured options, w/o defaults
  def configured_feature_flags
    feature_flag_options.sort_by(&:name).map(&:to_h).reduce({}, :merge).with_indifferent_access
  end

  # merges the user flags with the defaults
  # this is the most authoritative method for determining whether to enable a feature for a given model instance
  #
  # * *returns*
  #   - (Hash) => Hash of all feature flag values w/ configured values overriding defaults
  def feature_flags_with_defaults
    flag_names = FeatureFlag.pluck(:name).sort
    FeatureFlag.default_flag_hash.merge(feature_flags_for(*flag_names)).with_indifferent_access
  end

  # check if a given feature flag is configured for this instance
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #
  # * *returns*
  #   - (Boolean) => T/F if FeatureFlagOption exists for this instance/feature flag
  def flag_configured?(flag_name)
    FeatureFlagOption.where(name: flag_name, feature_flaggable_type: self.class.name, feature_flaggable_id: id).exists?
  end

  # getter for feature_flag_option instances
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #
  # * *returns*
  #   - (FeatureFlagOption, NilClass)
  def get_flag_option(flag_name)
    feature_flag_options.find_by(name: flag_name, feature_flaggable_type: self.class.name, feature_flaggable_id: id)
  end

  # set the feature flag option for a given flag
  # will create new FeatureFlagOption if none is present
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #   - +flag_value+ (Boolean) => value to set for flag
  #
  # * *returns*
  #   - (TrueClass) => if save succeeds
  #
  # * *raises*
  #   - (NameError) => if requested feature_flag does not exist
  #   - (Mongoid::Errors::Validations) => if save fails
  def set_flag_option(flag_name, flag_value)
    parent_flag = FeatureFlag.find_by(name: flag_name)
    raise NameError, "\"#{flag_name}\" is not a valid feature flag name" if parent_flag.nil?

    option = get_flag_option(flag_name) || feature_flag_options.build(feature_flag: parent_flag)
    option.update!(value: flag_value)
    true
  end

  # remove a given feature_flag_option from this instance
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #
  # * *returns*
  #   - (Boolean) => True if option was present & destroyed, false if option was not configured
  #
  # * *raises*
  #   - (NameError) => if requested feature_flag does not exist
  def remove_flag_option(flag_name)
    raise NameError, "#{flag_name} is not a valid feature flag name" unless FeatureFlag.where(name: flag_name).exists?

    option = get_flag_option(flag_name)
    if option.present?
      option.destroy
      true
    else
      false
    end
  end

  # get an array of FeatureFlagOption objects for form rendering (e.g. updating user feature flags in admin section)
  # note: when using with a Rails form builder, pass this as the second parameter to f.fields_for to render all the
  # nested forms in the parent form:
  #
  #   <%= f.fields_for :feature_flag_options, FeatureFlaggable.build_feature_flag_options(@user) do |ff_form| %>
  #     <%= render partial: 'feature_flag_options/feature_flag_option_fields', locals: { f: ff_form } %>
  #   <% end %>
  #
  # * *params*
  #   - +instance+ (Mongoid::Model) => model instance that is FeatureFlaggable
  #
  # * *returns*
  #   - (Array<FeatureFlagOption>) => array of FeatureFlagOptions for all FeatureFlags (building new where necessary)
  def self.build_feature_flag_options(instance)
    options = []
    FeatureFlag.all.order(name: :asc).each do |feature_flag|
      if instance.flag_configured?(feature_flag.name)
        options << instance.get_flag_option(feature_flag.name)
      else
        options << instance.feature_flag_options.build(feature_flag: feature_flag)
      end
    end
    options
  end

  # merge in _destroy parameter when handling form submissions to automatically remove any FeatureFlagOption
  # instances when the "default" for a feature flag is selected (denoted by empty string for value)
  #
  # * *params*
  #   - +params+ (ActionDispatch::Parameters, Hash) => Parameters hash from form submission, or Hash of params
  #   - +instance+ (Mongoid::Model) => FeatureFlaggable instance (for finding form entry)
  #
  # * *returns*
  #   - (Hash) => Hash representation of params, with _destroy: 1 included for "default" options
  def self.merge_default_destroy_param(params)
    # convert ActionDispatch::Http::Parameters to unsafe hash, if supplied
    converted_params = params.respond_to?(:to_unsafe_hash) ? params.to_unsafe_hash : params
    safe_params = converted_params.with_indifferent_access
    safe_params[NESTED_FORM_KEY].each do |id, option_attributes|
      if option_attributes[:value] == ''
        safe_params[NESTED_FORM_KEY][id][:_destroy] = '1'
      end
    end
    safe_params
  end

  # merges feature flags of the passed-in instances from left to right,
  # using the default flag has if none of the instances is present or supplies a value
  #
  # * *params*
  #   - +instances+ (Array<Mongoid::Model>) => array of FeatureFlaggable model instances, or nil
  #
  # * *returns*
  #   - (Hash) => Hash of feature flag values, merged in order passed
  def self.feature_flags_for_instances(*instances)
    flag_hash = FeatureFlag.default_flag_hash
    instances.each do |instance|
      flag_hash.merge!(instance.configured_feature_flags) if instance.present?
    end
    flag_hash.with_indifferent_access
  end

  # merges feature flags of the passed-in instances from left to right,
  # using the default flag has if none of the instances is present or supplies a value
  #
  # * *params*
  #   - +flag_name+ (String) => name of the feature flag to check
  #   - +instances+ (Array<Mongoid::Model>) => array of FeatureFlaggable model instances, or nil
  #
  # * *returns*
  #   - (Hash) => Hash of feature flag values, merged in order passed
  def self.merged_value_for(flag_name, *instances)
    value = FeatureFlag.find_by(name: flag_name)&.default_value
    instances.each do |instance|
      if instance.present?
        instance_option = FeatureFlagOption.find_by(name: flag_name, feature_flaggable: instance)
        if instance_option.present?
          value = instance_option.value
        end
      end
    end
    value
  end

  # check if any of the instances provided override the default value of a requested feature flag
  # this is useful for checking exemptions, where it may exist on one of many objects, and we want to know if any of
  # them contradict the default value of the parent FeatureFlag
  # not loading flag hashes makes this check much faster than using feature_flags_for_instances or
  # feature_flags_with_defaults
  #
  # * *params*
  #   - +flag_name+ (String) => name of feature flag
  #   - +override_value+ (Boolean) => boolean value to see if any instances have set
  #   - +instances+ (Array<Mongoid::Model>) => array of FeatureFlaggable model instances, or nil
  #
  # * *returns*
  #   - (Boolean) => T/F if any instances override the default flag value (always true override matches default)
  def self.flag_override_for_instances(flag_name, override_value, *instances)
    feature_flag = FeatureFlag.find_by(name: flag_name.to_s)
    # if feature flag doesn't exist, return true as it may have been retired (or this is a CI and it wasn't seeded)
    # also, if override and default are same, return true, since this is used in a validation context and false will
    # invoke a validation error
    return true if feature_flag.nil? || override_value == feature_flag.default_value

    class_names = []
    ids = []
    instances.each do |instance|
      next if instance.nil?

      class_names << instance.class.name
      ids << instance.id
    end
    FeatureFlagOption.where(value: override_value, name: flag_name,
                            :feature_flaggable_type.in => class_names.uniq,
                            :feature_flaggable_id.in => ids).exists?
  end

  # +DEPRECATED+
  #
  # use :remove_flag_option instead, this is only present for migration compatibility
  # updates each instance of the given model to clear the given flag
  # useful for obsoleting a given flag
  def self.remove_flag_from_model(model, flag_name)
    if model.respond_to?(:feature_flags)
      model.where(:"feature_flags.#{flag_name}".exists => true).each do |instance|
        instance.feature_flags.delete(flag_name)
        instance.save
      end
    end
  end
end
