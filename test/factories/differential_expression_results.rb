FactoryBot.define do
  factory :differential_expression_result do
    observed_values { [] }
    cluster_name { cluster.name }
    annotation_name { }
    annotation_scope { }
  end
end
