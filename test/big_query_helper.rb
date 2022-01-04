# get a row count for all BQ entities for a given study
def get_bq_row_count(study)
  bq_dataset = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET)
  bq_dataset.query("SELECT COUNT(*) count FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE study_accession = '#{study.accession}'", cache: false)[0][:count]
end

# seed BQ with 5 rows of data for a given study/metadata file
def seed_bq(study, metadata_file)
  begin
    puts "Directly seeding BigQuery w/ synthetic data for #{study.accession}"
    bq_seeds = File.open(Rails.root.join('db', 'seed', 'bq_seeds.json'))
    bq_data = JSON.parse bq_seeds.read
    bq_data.each do |entry|
      entry['CellID'] = SecureRandom.uuid
      entry['study_accession'] = study.accession
      entry['file_id'] = metadata_file.id.to_s
    end
    puts 'Data read, writing to newline-delimited JSON'
    tmp_filename = SecureRandom.uuid + '.json'
    tmp_file = File.new(Rails.root.join(tmp_filename), 'w+')
    tmp_file.write bq_data.map(&:to_json).join("\n")
    puts 'Data assembled, writing to BigQuery'
    bq_client = BigQueryClient.new.client
    dataset = bq_client.dataset(CellMetadatum::BIGQUERY_DATASET)
    table = dataset.table(CellMetadatum::BIGQUERY_TABLE)
    job = table.load(tmp_file, write: 'append', format: :json)
    puts 'Write complete, closing/removing files'
    bq_seeds.close
    tmp_file.close
    puts "BigQuery seeding completed: #{job}"
  rescue => e
    puts "Error encountered when seeding BigQuery: #{e.class.name} - #{e.message}"
  end
end
