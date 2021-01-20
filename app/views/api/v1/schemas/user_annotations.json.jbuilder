json.fields do
  json.array! UserAnnotation.attribute_names do |attribute|
    json.name attribute
    if UserAnnotation.fields[attribute].options[:type].to_s =~ /Object/
      json.type 'BSON::ObjectId'
    else
      json.type UserAnnotation.fields[attribute].options[:type].to_s
      if UserAnnotation.fields[attribute].default_val.to_s.present?
        json.default_value UserAnnotation.fields[attribute].default_val
      end
    end
    if UserAnnotation::REQUIRED_ATTRIBUTES.include? attribute
      json.required true
    end
  end
end
json.required_fields UserAnnotation::REQUIRED_ATTRIBUTES
