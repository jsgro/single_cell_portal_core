FactoryBot.define do
  # create a precomputed_score (i.e "gene list")
  factory :precomputed_score do
    study { study_file.study }
    name { }
    clusters { }
    gene_scores { }
  end
end
