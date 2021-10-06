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
                           ncbi_taxid: 100901,
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
    OmniAuth.config.mock_auth[:google_oauth2] = nil
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
    refute  config_file.include?("-H \"Authorization: Bearer"), 'Should not include bearer token if no TDR files are requested'

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

    expected_response = BulkDownloadService.get_download_info([@basic_study.accession])
    assert_equal expected_response.to_json, json.to_json
  end

  test 'single-study bulk download should include all study files' do
    study = @basic_study
    execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
    assert_response :success
    auth_code = json['auth_code']

    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
        auth_code: auth_code, accessions: study.accession)
    )
    assert_response :success

    study.study_files.each do |study_file|
      assert json.include?(study_file.name), "Bulk download config did not include #{study_file.name}"
    end
  end

  test 'should honor directory parameter for single-study bulk download' do
    study = FactoryBot.create(:detached_study,
                              name_prefix: 'Directory Study',
                              public: false,
                              user: @user,
                              test_array: @@studies_to_clean)
    file_types = %w[csv xlsx]
    file_types.each do |file_type|
      files = 1.upto(5).map { |i| "#{file_type}/file_#{i}.#{file_type}" }
      file_list = files.map { |file| { generation: 12345, name: file, size: 100 }.with_indifferent_access }
      directory = DirectoryListing.create!(study: study, file_type: file_type, name: file_type,
                                           files: file_list, sync_status: true)
      assert directory.persisted?
      execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
      assert_response :success
      auth_code = json['auth_code']
      mock = Minitest::Mock.new
      files.each do |file|
        mock_signed_url = "https://www.googleapis.com/storage/v1/b/#{study.bucket_id}/#{file_type}/#{file}"
        mock.expect :execute_gcloud_method, mock_signed_url,
                    [:generate_signed_url, 0, study.bucket_id, file, { expires: 1.day.to_i }]
      end
      FireCloudClient.stub :new, mock do
        execute_http_request(:get,
                             api_v1_bulk_download_generate_curl_config_path(
                               auth_code: auth_code,
                               accessions: [study.accession],
                               directory: "#{file_type}--#{file_type}"
                             )
        )
        assert_response :success
        mock.verify
        files.each do |file|
          assert json.include? file
        end
      end
    end
    execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
    assert_response :success
    auth_code = json['auth_code']
    mock = Minitest::Mock.new
    file_types.each do |file_type|
      files = 1.upto(5).map { |i| "#{file_type}/file_#{i}.#{file_type}" }
      files.each do |file|
        mock_signed_url = "https://www.googleapis.com/storage/v1/b/#{study.bucket_id}/#{file_type}/#{file}"
        mock.expect :execute_gcloud_method, mock_signed_url,
                    [:generate_signed_url, 0, study.bucket_id, file, { expires: 1.day.to_i }]
      end
    end
    FireCloudClient.stub :new, mock do
      execute_http_request(:get,
                           api_v1_bulk_download_generate_curl_config_path(
                             auth_code: auth_code,
                             accessions: [study.accession],
                             directory: 'all'
                           )
      )
      assert_response :success
      mock.verify
      file_types.each do |file_type|
        1.upto(5).each do |i|
          assert json.include? "#{file_type}/file_#{i}.#{file_type}"
        end
      end
    end
  end

  test 'multi-study bulk download should exclude sequence data' do
    # negative test, ensure that multi-study bulk download excludes sequence data
    new_study = FactoryBot.create(:detached_study,
                                  name_prefix: 'Extra Study',
                                  public: false,
                                  user: @user,
                                  test_array: @@studies_to_clean)
    new_study_cluster_file = FactoryBot.create(:cluster_file,
                                               name: 'cluster.txt',
                                               study: new_study,
                                               upload_file_size: 100)
    execute_http_request(:post, api_v1_bulk_download_auth_code_path, user: @user)
    assert_response :success
    auth_code = json['auth_code']

    execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
      auth_code: auth_code, accessions: [@basic_study.accession, new_study.accession])
    )
    assert_response :success

    excluded_file = @basic_study.study_files.by_type('Fastq').first
    refute json.include?(excluded_file.name), 'Bulk download config did not exclude external fastq link'
  end

  test 'bulk download should support a download_id and TDR files' do
    drs_id = "v1_#{SecureRandom.uuid}_#{SecureRandom.uuid}"
    hca_project_id = SecureRandom.uuid
    service_name = 'jade.datarepo-mock.broadinstitute.org'
    bucket_name = 'data-repo-mock-bucket'
    payload = {
      file_ids: [@basic_study_metadata_file.id.to_s],
      tdr_files: {
        FakeHCAStudy1: [
          {
            url: hca_project_id,
            name: 'hca_file1.tsv',
            file_type: 'Project Manifest'
          }, {
            name: 'hca_file2.tsv',
            file_type: 'analysis_file',
            drs_id: "drs://#{service_name}/#{drs_id}"
          }
        ]
      }
    }
    execute_http_request(:post, api_v1_bulk_download_auth_code_path, request_payload: payload, user: @user)
    assert_response :success
    auth_code = json['auth_code']
    download_id = json['download_id']

    # mock response values
    mock_signed_url = "https://www.googleapis.com/storage/v1/b/#{@basic_study.bucket_id}/metadata.txt"
    mock_azul_response = {
      Status: 302,
      Location: "https://service.azul.data.humancellatlas.org/manifest/files?catalog=dcp8&format=compact&filters=" \
                "%7B%22projectId%22%3A+%7B%22is%22%3A+%5B%22#{hca_project_id}%22%5D%7D%7D&objectKey=manifests%2F" \
                "#{SecureRandom.uuid}.tsv"
    }.with_indifferent_access
    mock_drs_response = {
      id: drs_id,
      name: 'hca_file2.tsv',
      access_methods: [
        {
          type: 'https',
          access_url: {
            url: "https://www.googleapis.com/storage/v1/b/#{bucket_name}/hca_file2.tsv"
          }
        }
      ]
    }.with_indifferent_access

    # mock all calls to external services, including Google Cloud Storage, HCA Azul, and Terra Data Repo
    gcs_mock = Minitest::Mock.new
    gcs_mock.expect :execute_gcloud_method, mock_signed_url,
                    [:generate_signed_url, 0, @basic_study.bucket_id, 'metadata.txt', { expires: 1.day.to_i }]
    azul_mock = Minitest::Mock.new
    azul_mock.expect :default_catalog, ApplicationController.hca_azul_client.default_catalog
    azul_mock.expect :get_project_manifest_link, mock_azul_response, [String, hca_project_id]
    tdr_mock = Minitest::Mock.new
    tdr_mock.expect :get_drs_file_info, mock_drs_response, ["drs://#{service_name}/#{drs_id}"]

    # stub all service clients to interpolate mocks
    FireCloudClient.stub :new, gcs_mock do
      ApplicationController.stub :hca_azul_client, azul_mock do
        ApplicationController.stub :data_repo_client, tdr_mock do
          execute_http_request(:get, api_v1_bulk_download_generate_curl_config_path(
            auth_code: auth_code, download_id: download_id))
          assert_response :success
          config_file = json

          gcs_mock.verify
          azul_mock.verify
          tdr_mock.verify

          expected_manifest_config = "url=\"#{mock_azul_response[:Location]}\"\noutput=\"FakeHCAStudy1/hca_file1.tsv\""
          expected_drs_config = "url=\"#{mock_drs_response[:access_methods].first.dig('access_url', 'url')}\"\n" \
                         "output=\"FakeHCAStudy1/hca_file2.tsv\""
          assert config_file.include?("#{@basic_study.accession}/metadata/metadata.txt"), 'did not include SCP metadata file'
          assert config_file.match(/-H "Authorization: Bearer ya29/), 'did not include bearer token header for TDR files'
          assert config_file.include?(expected_manifest_config), 'did not include correct HCA manifest file or output path'
          assert config_file.include?(expected_drs_config), 'did not include correct TDR file or output path'
        end
      end
    end
  end
end
