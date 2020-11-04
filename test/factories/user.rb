# factory for users objects.
FactoryBot.define do
  factory :user do
    transient do
      random_seed { SecureRandom.alphanumeric(4).upcase }
    end
    email { "test.user.#{random_seed}@test.edu" }
    password { "test_password" }
    factory :api_user do
      api_access_token {
                         {
                           access_token: "test-api-token-#{random_seed}",
                           expires_in: 3600, expires_at: Time.zone.now + 1.hour
                         }
                       }
    end
  end
end
