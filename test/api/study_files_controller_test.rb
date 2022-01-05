require 'api_test_helper'
require 'user_tokens_helper'
require 'test_helper'

class StudyFilesControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @other_user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:study,
                               name_prefix: 'StudyFile Study',
                               public: true,
                               user: @user,
                               test_array: @@studies_to_clean,
                               predefined_file_types: %w[cluster])
    @study_file = @study.study_files.first
  end

  setup do
    sign_in_and_update @user
  end

  teardown do
    OmniAuth.config.mock_auth[:google_oauth2] = nil
    reset_user_tokens
  end

  test 'should get index' do
    execute_http_request(:get, api_v1_study_study_files_path(@study))
    assert_response :success
    assert json.size >= 1, 'Did not find any study_files'
  end

  test 'should get study file' do
    execute_http_request(:get, api_v1_study_study_file_path(study_id: @study.id, id: @study_file.id))
    assert_response :success
    @study_file.reload # gotcha in case 'should parse study file' test has already run
    # check all attributes against database
    @study_file.attributes.each do |attribute, value|
      if attribute =~ /_id/
        assert json[attribute] == JSON.parse(value.to_json), "Attribute mismatch: #{attribute} is incorrect, expected #{JSON.parse(value.to_json)} but found #{json[attribute.to_s]}"
      elsif attribute =~ /_at/
        # ignore timestamps as fprmatting & drift on milliseconds can cause comparison errors
        next
      else
        assert json[attribute] == value, "Attribute mismatch: #{attribute} is incorrect, expected #{value} but found #{json[attribute.to_s]}"
      end
    end

    # ensure other users cannot access study_file
    sign_in_and_update @other_user
    execute_http_request(:get, api_v1_study_study_file_path(study_id: @study.id, id: @study_file.id), user: @other_user)
    assert_response 403
  end

  # create, update & delete tested together to use new object to avoid delete/update running before create
  test 'should create then update then delete study file' do
    # create study file
    study_file_attributes = {
      study_file: {
        upload_file_name: 'table_1.xlsx',
        upload_content_type: 'application/octet-stream',
        upload_file_size: 41692,
        file_type: 'Other'
      }
    }
    execute_http_request(:post, api_v1_study_study_files_path(study_id: @study.id), request_payload: study_file_attributes)
    assert_response :success
    assert json['name'] == study_file_attributes[:study_file][:upload_file_name], "Did not set name correctly, expected #{study_file_attributes[:study_file][:upload_file_name]} but found #{json['name']}"
    # update study file
    study_file_id = json['_id']['$oid']
    update_attributes = {
      study_file: {
        description: "Test description #{SecureRandom.uuid}"
      }
    }
    execute_http_request(:patch, api_v1_study_study_file_path(study_id: @study.id, id: study_file_id), request_payload: update_attributes)
    assert_response :success
    assert json['description'] == update_attributes[:study_file][:description], "Did not set description correctly, expected #{update_attributes[:study_file][:description]} but found #{json['description']}"
    # delete study file
    execute_http_request(:delete, api_v1_study_study_file_path(study_id: @study.id, id: study_file_id))
    assert_response 204, "Did not successfully delete study file, expected response of 204 but found #{@response.response_code}"
  end

  # create a study file bundle using the study_files_controller method
  test 'should create study file bundle' do
    study_file_bundle_attributes = {
      'files' => [
        { 'name' => 'cluster.tsv', 'file_type' => 'Cluster' },
        { 'name' => 'labels.tsv', 'file_type' => 'Coordinate Labels' }
      ]
    }
    execute_http_request(:post, api_v1_study_study_files_bundle_files_path(study_id: @study.id), request_payload: study_file_bundle_attributes)
    assert_response :success
    assert json['original_file_list'] == study_file_bundle_attributes['files'],
           "Did not set name correctly, expected #{study_file_bundle_attributes['files']} but found #{json['original_file_list']}"
    # delete study file bundle
    study_file_bundle_id = json['_id']['$oid']
    execute_http_request(:delete, api_v1_study_study_file_bundle_path(study_id: @study.id, id: study_file_bundle_id))
    assert_response 204, "Did not successfully delete study file bundle, expected response of 204 but found #{@response.response_code}"
  end

  test 'should parse study file' do
    execute_http_request(:post, parse_api_v1_study_study_file_path(study_id: @study.id, id: @study_file.id))
    assert_response 204
  end

  test 'should enforce edit access restrictions on study files' do
    sign_in_and_update @other_user
    description = "This is the updated description with random seed #{@random_seed}"
    update_attributes = {
      study_file: {
        description: description
      }
    }
    execute_http_request(:patch, api_v1_study_study_file_path(study_id: @study.id, id: @study_file.id.to_s),
                         request_payload: update_attributes, user: @other_user)
    assert_response 403
    @study_file.reload
    refute @study_file.description == description
  end
end
