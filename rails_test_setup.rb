#!/usr/bin/env ruby

require 'json'

# set up the test environment for running bin/run_tests.sh by exporting all secrets/credentials
# usage:
# ruby rails_test_setup.rb (--vault-basepath=secret/kdux/scp/staging --use-configured-namespace)
#
# arguments:
#
# --vault-path (string): sets the base vault path (optional, defaults to secret/kdux/scp/staging for CI)
# --use-vault-namespace: will set PORTAL_NAMESPACE value from vault via scp_config.json, otherwise uses single-cell-portal-test (optional)


source_file_string = "#!/bin/bash\n"
base_vault_path = 'secret/kdux/scp/staging'

use_vault_namespace = false
ARGV.each do |arg|
  case arg
  when /--vault-path/
    base_vault_path = arg.split('=').last.strip
  when /--use-vault-namespace/
    use_vault_namespace = true
  end
end

vault_secret_path = "#{base_vault_path}/scp_config.json"
read_only_service_account_path = "#{base_vault_path}/read_only_service_account.json"
service_account_path = "#{base_vault_path}/scp_service_account.json"

CONFIG_DIR = File.expand_path('.') + "/config"

# load raw secrets from vault
puts 'Processing secret parameters from vault'
secret_string = `vault read -format=json #{vault_secret_path}`
secret_data_hash = JSON.parse(secret_string)['data']

secret_data_hash.each do |key, value|
  # overwrite PORTAL_NAMESPACE unless --use-configured-namespace is declared
  if key == 'PORTAL_NAMESPACE'
    value_override = use_vault_namespace ? value : 'single-cell-portal-test'
    source_file_string += "export #{key}=#{value_override}\n"
  else
    source_file_string += "export #{key}=#{value}\n"
  end
end

source_file_string += "export RAILS_ENV=test\n"
source_file_string += "export PASSENGER_APP_ENV=test\n"
source_file_string += "export DATABASE_NAME=single_cell_portal_test\n"
source_file_string += "export MONGODB_USERNAME=#{secret_data_hash['MONGODB_ADMIN_USER']}\n"
source_file_string += "export MONGODB_PASSWORD=#{secret_data_hash['MONGODB_ADMIN_PASSWORD']}\n"
source_file_string += "export DATABASE_HOST=#{secret_data_hash['MONGO_LOCALHOST']}\n"

puts 'Processing service account info'
service_account_string = `vault read -format=json #{service_account_path}`
service_account_hash = JSON.parse(service_account_string)['data']

File.open("#{CONFIG_DIR}/.scp_service_account.json", 'w') { |file| file.write(service_account_hash.to_json) }
puts "Setting google cloud project: #{service_account_hash['project_id']}"
source_file_string += "export GOOGLE_CLOUD_PROJECT=#{service_account_hash['project_id']}\n"
source_file_string += "export SERVICE_ACCOUNT_KEY=#{CONFIG_DIR}/.scp_service_account.json\n"

puts 'Processing readonly service account info'
readonly_string = `vault read -format=json #{read_only_service_account_path}`
readonly_hash = JSON.parse(readonly_string)['data']
File.open("#{CONFIG_DIR}/.read_only_service_account.json", 'w') { |file| file.write(readonly_hash.to_json) }
source_file_string += "export READ_ONLY_SERVICE_ACCOUNT_KEY=#{CONFIG_DIR}/.read_only_service_account.json\n"

puts 'Setting secret_key_base'
source_file_string += "export SECRET_KEY_BASE=#{`openssl rand -hex 64`}\n"

File.open("#{CONFIG_DIR}/secrets/.source_env.bash", 'w') { |file| file.write(source_file_string) }

puts "Load Complete!\n  Run the command below to load the environment variables you need into your shell\n\nsource config/secrets/.source_env.bash\n\n"
