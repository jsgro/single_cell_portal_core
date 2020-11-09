# seeds_helper.rb
# common helper file that manages data created in db/seeds.rb
# this helper can be included in other test helpers to get these methods into any test suite while sidestepping
# "double require" issues found at the top of most test helpers

# count number of rows in BQ for this instance
def get_bq_row_count(study)
  bq_dataset = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET)
  bq_dataset.query("SELECT COUNT(*) count FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE study_accession = '#{study.accession}'", cache: false)[0][:count]
end

# helper to restore user access tokens on test teardown to prevent successive downstream failures
def reset_user_tokens
  User.all.each do |user|
    token = {access_token: SecureRandom.uuid, expires_in: 3600, expires_at: Time.zone.now + 1.hour}
    user.update!(access_token: token, api_access_token: token)
    user.update_last_access_at!
  end
end

# seed data into bigquery
def seed_bigquery(study_accession, file_id)
  bq_seeds = File.open(Rails.root.join('db', 'seed', 'bq_seeds.json'))
  bq_data = JSON.parse bq_seeds.read
  bq_data.each do |entry|
    entry['CellID'] = SecureRandom.uuid
    entry['study_accession'] = study_accession
    entry['file_id'] = file_id
  end
  File.new('tmp_bq_seeds.json', 'w+') do |tmp_file|
    tmp_file.write bq_data.map(&:to_json).join("\n")
    table = ApplicationController.big_query_client.dataset(CellMetadatum::BIGQUERY_DATASET).table(CellMetadatum::BIGQUERY_TABLE)
    table.load tmp_file, write: 'append'
  end
end
