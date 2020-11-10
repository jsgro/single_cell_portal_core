# seeds_helper.rb
# common helper file that manages data created in db/seeds.rb
# this helper can be included in other test helpers to get these methods into any test suite while sidestepping
# "double require" issues found at the top of most test helpers

# count number of rows in BQ for this instance
def get_bq_row_count(study)
  bq_dataset = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET)
  bq_dataset.query("SELECT COUNT(*) count FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE study_accession = '#{study.accession}'", cache: false)[0][:count]
end

# seed data into bigquery
def seed_bigquery(study_accession, file_id)
  File.open(Rails.root.join('db', 'seed', 'bq_seeds.json')) do |bq_seeds|
    bq_data = JSON.parse bq_seeds.read
    bq_data.each do |entry|
      entry['CellID'] = SecureRandom.uuid
      entry['study_accession'] = study_accession
      entry['file_id'] = file_id
    end
    Tempfile.open(['tmp_bq_seeds', '.json']) do |tmp_file|
      tmp_file.write bq_data.map(&:to_json).join("\n")
      table = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET).table(CellMetadatum::BIGQUERY_TABLE)
      table.load tmp_file, write: 'append'
    end
  end
end
