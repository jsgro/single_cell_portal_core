require 'api_test_helper'
require 'user_tokens_helper'
require 'test_helper'

class ApiSiteControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:admin_user, test_array: @@users_to_clean)
    @other_user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:study,
                               name_prefix: 'API Site Controller Study',
                               public: true,
                               user: @user,
                               test_array: @@studies_to_clean)

    # add cluster file to FactoryBot study
    TestDataPopulator.add_files_to_study(@study, file_types: %w[cluster])

    StudyShare.create!(email: 'fake.email@gmail.com', permission: 'Reviewer', study: @study)
    StudyFile.create(study: @study, name: 'SRA Study for housing fastq data', description: 'SRA Study for housing fastq data',
                     file_type: 'Fastq', status: 'uploaded', human_fastq_url: 'https://www.ncbi.nlm.nih.gov/sra/ERX4159348[accn]')
    DirectoryListing.create!(name: 'csvs', file_type: 'csv', files: [{name: 'foo.csv', size: 100, generation: '12345'}],
                             sync_status: true, study: @study)
    StudyFileBundle.create!(bundle_type: 'BAM',
                            original_file_list: [
                              { 'name' => 'sample_1.bam', 'file_type' => 'BAM' },
                              { 'name' => 'sample_1.bam.bai', 'file_type' => 'BAM Index' }
                            ],
                            study: @study)
    @study.external_resources.create(url: 'https://singlecell.broadinstitute.org', title: 'SCP',
                                                  description: 'Link to Single Cell Portal')
    AnalysisConfiguration.create(namespace: 'single-cell-portal', name: 'split-cluster', snapshot: 1,
                                 user: @user, configuration_namespace: 'single-cell-portal',
                                 configuration_name: 'split-cluster', configuration_snapshot: 2,
                                 description: 'This is a test description.')
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
    reset_user_tokens
    @study.update(public: true, detached: false)
  end

  after(:all) do
    AnalysisConfiguration.destroy_all
  end

  test 'should get all studies' do
    sign_in_and_update @user
    viewable = Study.viewable(@user)
    execute_http_request(:get, api_v1_site_studies_path)
    assert_response :success
    assert_equal json.size, viewable.size, "Did not find correct number of studies, expected #{viewable.size} or more but found #{json.size}"
  end

  test 'should get one study' do
    sign_in_and_update @user
    expected_files = @study.study_files.downloadable.count
    expected_resources = @study.external_resources.count
    execute_http_request(:get, api_v1_site_study_view_path(accession: @study.accession))
    assert_response :success
    assert json['study_files'].size == expected_files,
           "Did not find correct number of files, expected #{expected_files} but found #{json['study_files'].size}"
    assert json['external_resources'].size == expected_resources,
           "Did not find correct number of resource links, expected #{expected_resources} but found #{json['external_resources'].size}"

    # ensure access restrictions are in place
    @study.update(public: false)
    sign_in_and_update @other_user
    execute_http_request(:get, api_v1_site_study_view_path(accession: @study.accession), user: @other_user)
    assert_response 403
  end

  test 'should get all analyses' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_site_analyses_path)
    assert_response :success
    assert json.size == 1, "Did not find correct number of analyses, expected 1 but found #{json.size}"
  end

  test 'should get one analysis' do
    sign_in_and_update @user
    @analysis_configuration = AnalysisConfiguration.first
    execute_http_request(:get, api_v1_site_get_analysis_path(namespace: @analysis_configuration.namespace,
                                                             name: @analysis_configuration.name,
                                                             snapshot: @analysis_configuration.snapshot))
    assert_response :success
    assert json['name'] == @analysis_configuration.name,
           "Did not load correct analysis name, expected '#{@analysis_configuration.name}' but found '#{json['name']}'"
    assert json['description'] == @analysis_configuration.description,
           "Description did not match; expected '#{@analysis_configuration.description}' but found '#{json['description']}'"
    assert json['required_inputs'] == @analysis_configuration.required_inputs(true),
           "Required inputs do not match; expected '#{@analysis_configuration.required_inputs(true)}' but found #{json['required_inputs']}"
  end

  test 'should respond 410 on detached study' do
    sign_in_and_update @user
    @study.update(detached: true)
    file = @study.study_files.first

    execute_http_request(:get, api_v1_site_study_download_data_path(accession: @study.accession, filename: file.upload_file_name))
    assert_response 410,
                    "Did not provide correct response code when downloading file from detached study, expected 401 but found #{response.code}"
  end

  test 'should download file' do
    sign_in_and_update @user
    file = @study.study_files.first

    execute_http_request(:get, api_v1_site_study_download_data_path(accession: @study.accession, filename: file.upload_file_name))
    assert_response 302, "Did not correctly redirect to file: #{response.code}"

    # since this is an external redirect, we cannot call follow_redirect! but instead have to get the location header
    signed_url = response.headers['Location']
    assert signed_url.include?(file.upload_file_name), "Redirect url does not point at requested file"

    # now assert 401 if user isn't signed in
    # we can mimic the sign-out by unsetting the user object so that no Authorization: Bearer token is passed with the request
    @user = nil
    execute_http_request(:get, api_v1_site_study_download_data_path(accession: @study.accession, filename: file.upload_file_name))
    assert_response 401, "Did not correctly respond 401 if user is not signed in: #{response.code}"

    # ensure private downloads respect access restriction
    @study.update(public: false)
    sign_in_and_update @other_user
    execute_http_request(:get, api_v1_site_study_download_data_path(accession: @study.accession, filename: file.upload_file_name),
                         user: @other_user)
    assert_response 403
  end

  test 'should get stream options for file' do
    sign_in_and_update @user
    file = @study.study_files.first

    execute_http_request(:get, api_v1_site_study_stream_data_path(accession: @study.accession, filename: file.upload_file_name))
    assert_response :success
    assert_equal file.upload_file_name, json['filename'],
                 "Incorrect file was returned; #{file.upload_file_name} != #{json['filename']}"
    assert json['url'].include?(file.upload_file_name),
                                "Url does not contain correct file: #{file.upload_file_name} is not in #{json['url']}"

    # since this is a 'public' study, the access token in the read-only service account token
    public_token = ApplicationController.read_only_firecloud_client.valid_access_token['access_token']
    assert_equal public_token, json['access_token']

    # assert 401 if no user is signed in
    @user = nil
    execute_http_request(:get, api_v1_site_study_stream_data_path(accession: @study.accession, filename: file.upload_file_name))
    assert_response 401, "Did not correctly respond 401 if user is not signed in: #{response.code}"

    @study.update(public: false)
    sign_in_and_update @other_user
    execute_http_request(:get, api_v1_site_study_stream_data_path(accession: @study.accession, filename: file.upload_file_name),
                         user: @other_user)
    assert_response 403
  end

  test 'external sequence data should return correct download link' do
    sign_in_and_update @user
    external_sequence_file = @study.study_files.by_type('Fastq').first
    execute_http_request(:get, api_v1_site_study_view_path(accession: @study.accession))
    assert_response :success
    external_entry = json['study_files'].detect {|file| file['name'] == external_sequence_file.name}
    assert_equal external_sequence_file.human_fastq_url, external_entry['download_url'],
                 "Did not return correct download url for external fastq; #{external_entry['download_url']} != #{external_sequence_file.human_fastq_url}"
  end
end
