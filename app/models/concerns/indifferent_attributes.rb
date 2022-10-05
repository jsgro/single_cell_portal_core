# creates version of :attributes that has indifferent access
module IndifferentAttributes
  extend ActiveSupport::Concern

  def indifferent_attributes
    attribute_values = attribute_names.map { |name| send(name) }
    Hash[attribute_names.zip(attribute_values)].with_indifferent_access
  end

  alias attributes indifferent_attributes
end
