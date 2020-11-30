# get a row count for all BQ entities for a given study
def get_bq_row_count(study)
  bq_dataset = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET)
  bq_dataset.query("SELECT COUNT(*) count FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE study_accession = '#{study.accession}'", cache: false)[0][:count]
end
