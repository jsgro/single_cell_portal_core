module FeatureFlagOptionsHelper
  # show a label when editing instance feature flags
  def get_instance_label(instance)
    label = "#{instance.class}: "
    case instance.class.name
    when 'Study'
      attribute = :accession
    when 'BrandingGroup'
      attribute = :name
    when 'User'
      attribute = :email
    else
      attribute = :id
    end
    label + instance.send(attribute).to_s
  end
end
