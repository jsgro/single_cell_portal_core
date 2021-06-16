require 'api_test_helper'
require 'test_helper'
require 'user_tokens_helper'
require 'bulk_download_helper'

class BulkDownloadControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include TestInstrumentor


  SYNTH_STUDY_FOLDER = 'mouse_brain' # use the mouse_Brain study as it has all file types including genomic

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @taxon = Taxon.find_or_create_by!(common_name: 'mouse_fake1',
                           scientific_name: 'Mus musculusfake1',
                           user: User.first,
                           ncbi_taxid: 10090,
                           notes: 'fake mouse taxon 1 for testing')
    @genome_assembly = GenomeAssembly.find_or_create_by!(name: "GRCm38",
                                              alias: nil,
                                              release_date: '2012-01-09',
                                              accession: "GCA_000001635.2",
                                              taxon: @taxon)
    @genome_annotation = GenomeAnnotation.find_or_create_by!(name: 'Ensembl 94',
                                                  link: 'http://google.com/search?q=mouse',
                                                  index_link: 'http://google.com/search?q=mouse_index',
                                                  release_date: '2020-10-19',
                                                  genome_assembly: @genome_assembly)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Basic Cluster Study',
                                     public: false,
                                     user: @user,
                                     test_array: @@studies_to_clean)
    @basic_study_cluster_file = FactoryBot.create(:cluster_file,
                                                  name: 'clusterA.txt',
                                                  study: @basic_study,
                                                  upload_file_size: 100)

    @basic_study_metadata_file = FactoryBot.create(:metadata_file,
                                                   name: 'metadata.txt',
                                                   study: @basic_study,
                                                   upload_file_size: 200)

    @basic_study_expression_file = FactoryBot.create(:expression_file,
                                                   name: 'expression.txt',
                                                   taxon: @taxon,
                                                   expression_file_info: {
                                                     is_raw_counts: true,
                                                     units: 'raw counts',
                                                     library_preparation_protocol: 'Drop-seq',
                                                     biosample_input_type: 'Whole cell',
                                                     modality: 'Proteomic'
                                                   },
                                                   study: @basic_study,
                                                   upload_file_size: 300)

    @basic_study_fastq_file = FactoryBot.create(:study_file,
                                                  name: 'fastq.fastq',
                                                  file_type: 'Fastq',
                                                  taxon: @taxon,
                                                  study: @basic_study,
                                                  upload_file_size: 100)
    sign_in_and_update @user
  end


  teardown do
    OmniAuth.config.mock_auth[:google] = nil
    @taxon.destroy
  end

  # should generate a config text file to pass to curl for bulk download
  test 'should generate curl config for bulk download' do
    study = @basic_study

    execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
    assert_response :success
    auth_code = json['auth_code']

    file_types = %w(Expression Metadata).join(',')
    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
        auth_code: auth_code, accessions: study.accession, file_types: file_types, directory: 'all')
    )
    assert_response :success

    files = study.study_files.by_type(['Expression Matrix', 'Metadata'])
    config_file = json

    # note that this file will be full of error messages since this is a detached study, but
    # we can still validate that the correct files and urls were generated
    files.each do |file|
      filename = file.upload_file_name
      assert config_file.include?(filename), "Did not find URL for filename: #{filename}"
      output_path = file.bulk_download_pathname
      assert config_file.include?(output_path), "Did not correctly set output path for #{filename} to #{output_path}"
    end

    refute config_file.include?('clusterA.txt'), "Should not include cluster file, as it was not a requested type"

    # ensure bad/missing auth_token return 401
    invalid_auth_code = auth_code.to_i + 1
    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
        auth_code: invalid_auth_code, accessions: study.accession, file_types: file_types)
    )
    assert_response :unauthorized

    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(accessions: study.accession, file_types: file_types))
    # response should fail with no auth_code, since auth code is required
    assert_response :unauthorized
  end

  test 'should return preview of bulk download files and total bytes' do
    study = @basic_study
    execute_http_request(:get, api_v1_bulk_download_summary_path(accessions: study.accession), user: @user)
    assert_response :success

    expected_files = study.study_files
    expected_response = BulkDownloadService.get_download_info([@basic_study.accession])
    assert_equal expected_response.to_json, json.to_json
  end

  test 'bulk download should exclude external sequence data by default' do
    study = @basic_study
    execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
    assert_response :success
    auth_code = json['auth_code']

    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
        auth_code: auth_code, accessions: study.accession)
    )
    assert_response :success

    excluded_file = study.study_files.by_type('Fastq').first
    refute json.include?(excluded_file.name), 'Bulk download config did not exclude external fastq link'
  end
end
