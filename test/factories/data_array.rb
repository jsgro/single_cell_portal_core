# factory for data_array test objects.  For now only supports gene and cluster group types
FactoryBot.define do
  factory :data_array do
    transient do
      # convenience allowing specification of a ClusterGroup, rather than id and name individually
      cluster_group { nil }
    end
    transient do
      # convenience allowing specification of a Gene, rather than id and name individually
      gene { nil }
    end
    transient do
      # convenience allowing specification of a CellMetadatum, rather than id and name individually
      cell_metadatum { nil }
    end

    study { study_file.study }
    cluster_name { cluster_group.try(:name) || study_file.try(:name) }
    cluster_group_id { cluster_group.try(:id) }
    linear_data_id { cluster_group.try(:id) || gene.try(:id) || cell_metadatum.try(:id) || study.id }
    subsample_threshold { nil }
    subsample_annotation { nil }
    linear_data_type do
      if cluster_group_id
        'ClusterGroup'
      elsif gene
        'Gene'
      elsif cell_metadatum
        'CellMetadatum'
      else
        'Study'
      end
    end
  end
end
