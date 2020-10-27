# factory for study_file test objects.
FactoryBot.define do
  factory :study_file do
    upload_file_name { name }
  end
end
