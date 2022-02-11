FactoryBot.define do
  factory :author do
    first_name { 'John' }
    last_name { 'Doe' }
    email { "#{first_name}.#{last_name}@test.edu" }
    institution { 'Test University' }
    corresponding { false }
  end
end
