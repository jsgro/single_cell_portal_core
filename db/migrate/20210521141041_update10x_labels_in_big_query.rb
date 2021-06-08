class Update10xLabelsInBigQuery < Mongoid::Migration
  # from https://cloud.google.com/bigquery/docs/updating-data#updating_data
  def self.up
    client = BigQueryClient.new.client
    [CellMetadatum::BIGQUERY_DATASET, 'cell_metadata_test'].each do |dataset_name|
      dataset = client.dataset(dataset_name)
      if dataset.present?
        col_name = 'library_preparation_protocol__ontology_label'
        # query will match all instances of library_preparation_protocol__ontology_label beginning with the
        # substring '10x ' and will truncate "sequencing" off of the end
        update_query = "UPDATE #{CellMetadatum::BIGQUERY_TABLE}"
        replace_clause = "SET #{col_name} = REGEXP_REPLACE(#{col_name}, r\" sequencing$\", \"\")"
        where_clause = "WHERE REGEXP_CONTAINS(#{col_name}, r\"^10x.*sequencing$\")"
        query_string = "#{update_query} #{replace_clause} #{where_clause}"
        dataset.query query_string
      end
    end
    # update cached entries
    SearchFacet.update_all_facet_filters
  end

  def self.down
  end
end
