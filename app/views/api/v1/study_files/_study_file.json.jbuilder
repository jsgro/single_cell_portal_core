study_file.attributes.each do |name, value|
  unless name == '_id' && !study_file.persisted?
    json.set! name, value
  end
end

json.set! 'expression_file_info', study_file.expression_file_info
json.set! 'cluster_file_info', study_file.cluster_file_info
