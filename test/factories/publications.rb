FactoryBot.define do
  factory :publication do
    title { 'My Single-cell Paper' }
    journal { 'Nature' }
    pmcid { 'PMC1234567' }
    url { "https://www.ncbi.nlm.nih.gov/pmc/articles/#{pmcid}" }
    citation { }
    preprint { false }
  end
end
