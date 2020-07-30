study.attributes.each do |name, value|
  unless name == '_id' && !study.persisted?
    json.set! name, name == 'description' ? strip_tags(value) : value
  end
end
