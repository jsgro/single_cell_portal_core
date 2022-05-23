##
# BigQueryClient: lightweight shim around Google::Cloud::BigQuery library to DRY up references to credentials/datasets

class BigQueryClient
  extend ServiceAccountManager

  attr_accessor :project, :service_account_credentials, :client

  def initialize(service_account = self.class.get_primary_keyfile, compute_project = self.class.compute_project)
    Google::Cloud::Bigquery.configure do |config|
      config.project_id  = compute_project
      config.credentials = service_account
      config.timeout = 120
    end
    self.project = compute_project
    self.service_account_credentials = service_account
    self.client = Google::Cloud::Bigquery.new
  end

  # clears the entire BQ table.  This is only intended for utility use in tests/development
  # it will no-op in production
  def self.clear_bq_table
    if Rails.env.production?
      return
    end
    client = BigQueryClient.new.client
    query = "DELETE FROM #{CellMetadatum::BIGQUERY_TABLE} WHERE 1 = 1"
    client.dataset(CellMetadatum::BIGQUERY_DATASET).query(query)
  end
end
