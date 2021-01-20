user_annotation.attributes.each do |name, value|
  unless name == '_id' && !user_annotation.persisted?
    json.set! name, value
  end
end
