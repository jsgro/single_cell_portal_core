study.attributes.each do |name, value|
  unless name == '_id' && !study.persisted?
    json.set! name, value
  end
end
json.set! :full_description, study.full_description if show_full_description
json.set! :owner_email, @study_owner_emails[study._id.to_s] if @study_owner_emails
