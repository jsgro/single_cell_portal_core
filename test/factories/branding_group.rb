FactoryBot.define do
  # create a branding_group (collection) to assign users & studies to
  factory :branding_group do
    transient do
      user_list { [] } # pass in a list of users to assign as curators
    end
    name { "FactoryBot Collection #{SecureRandom.alphanumeric(5)}" }
    user_ids { user_list.map(&:id) }
    font_family { 'Helvetica Neue, sans-serif' }
    background_color { '#FFFFFF' }
    public { true }
  end
end
