# factory for study_file test objects.
FactoryBot.define do
  factory :data_array do
    transient do
      # convenience allowing specification of a ClusterGroup, rather than id and name individually
      cluster_group { nil }
    end
    study { study_file.study }
    cluster_name { cluster_group.try(:name) }
    cluster_group_id { cluster_group.try(:id) }
    linear_data_id { cluster_group.try(:id) }
    linear_data_type { 'ClusterGroup' }
  end
end
