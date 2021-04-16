require 'test_helper'
require 'api_test_helper'

class AnnotationsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Basic Cluster Study',
                                     public: false,
                                     user: @user,
                                     test_array: @@studies_to_clean)
    @basic_study_cluster_file = FactoryBot.create(:cluster_file,
                                                  name: 'clusterA.txt',
                                                  study: @basic_study,
                                                  cell_input: {
                                                     x: [1, 4 ,6],
                                                     y: [7, 5, 3],
                                                     cells: ['A', 'B', 'C']
                                                  },
                                                  annotation_input: [{name: 'foo', type: 'group', values: ['bar', 'bar', 'baz']}])

    @basic_study_metadata_file = FactoryBot.create(:metadata_file,
                                                   name: 'metadata.txt',
                                                   study: @basic_study,
                                                   cell_input: ['A', 'B', 'C'],
                                                   annotation_input: [
                                                     {name: 'species', type: 'group', values: ['dog', 'cat', 'dog']},
                                                     {name: 'disease', type: 'group', values: ['none', 'none', 'measles']}
                                                   ])
  end

  teardown do
    OmniAuth.config.mock_auth[:google] = nil
  end

  test 'methods should check view permissions' do
    user2 = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    sign_in_and_update user2
    execute_http_request(:get, api_v1_study_annotations_path(@basic_study), user: user2)
    assert_equal 403, response.status

    execute_http_request(:get, api_v1_study_annotation_path(@basic_study, 'foo'), user: user2)
    assert_equal 403, response.status

    execute_http_request(:get, cell_values_api_v1_study_annotation_path(@basic_study, 'foo'), user: user2)
    assert_equal 403, response.status

    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_annotations_path(@basic_study, 'foo'), user: @user)
    assert_equal 200, response.status
  end

  test 'index should return list of annotations' do
    empty_study = FactoryBot.create(:detached_study, name_prefix: 'Empty Annotation Study', test_array: @@studies_to_clean)
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_annotations_path(@basic_study))
    assert_equal 3, json.length
    assert_equal(['species', 'disease', 'foo'], json.map {|annot| annot['name']})
    assert_equal({"name"=>"species", "type"=>"group", "values"=>["dog", "cat"], "scope"=>"study"}, json[0])

    execute_http_request(:get, api_v1_study_annotations_path(empty_study))
    assert_equal [], json
  end

  test 'show should fetch a single annotation' do
    sign_in_and_update @user
    execute_http_request(:get,
                         api_v1_study_annotation_path(@basic_study,
                                                      'foo',
                                                      params: {annotation_scope: 'cluster',
                                                               annotation_type: 'group',
                                                               cluster: 'clusterA.txt'}))
    assert_equal json['name'], 'foo'
    execute_http_request(:get, api_v1_study_annotation_path(@basic_study, 'nonExistentAnnotation'))
    # returns the default annotation if it's not found by name/type
    assert_equal 'species', json['name']
  end

  test 'cell_values should return visualization tsv' do
    sign_in_and_update @user
    execute_http_request(:get,
                         cell_values_api_v1_study_annotation_path(@basic_study,
                                                                  'foo',
                                                                  params: {annotation_scope: 'cluster',
                                                                           annotation_type: 'group',
                                                                           cluster: 'clusterA.txt'}))
    assert_equal json, "NAME\tfoo\nA\tbar\nB\tbar\nC\tbaz"
  end
end
