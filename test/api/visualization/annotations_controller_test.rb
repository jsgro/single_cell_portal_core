require 'api_test_helper'
require 'test_instrumentor'

class AnnotationsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
    include TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user)
    OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
                                                                           :provider => 'google_oauth2',
                                                                           :uid => '123545',
                                                                           :email => 'testing.user@gmail.com'
                                                                       })
    @basic_study = FactoryBot.create(:detached_study,
                                     name: 'Basic Cluster Study',
                                     public: false,
                                     user: @user)
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
    @user2 = FactoryBot.create(:api_user)
    @empty_study = FactoryBot.create(:detached_study, name: 'Empty Annotation Study')
  end

  after(:all) do
    @basic_study.destroy
    @empty_study.destroy
    @user.destroy
    @user2.destroy
  end

  test 'methods should check view permissions' do
    sign_in_and_update @user2
    execute_http_request(:get, api_v1_study_annotations_path(@basic_study), user: @user2)
    assert_equal 403, response.status

    execute_http_request(:get, api_v1_study_annotation_path(@basic_study, 'foo'), user: @user2)
    assert_equal 403, response.status

    execute_http_request(:get, cell_values_api_v1_study_annotation_path(@basic_study, 'foo'), user: @user2)
    assert_equal 403, response.status
  end

  test 'index should return list of annotations' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_annotations_path(@basic_study))
    assert_equal 3, json.length
    assert_equal(['species', 'disease', 'foo'], json.map {|annot| annot['name']})
    assert_equal({"name"=>"species", "type"=>"group", "values"=>["dog", "cat"], "scope"=>"study"}, json[0])

    execute_http_request(:get, api_v1_study_annotations_path(@empty_study))
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
