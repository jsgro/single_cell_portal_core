require 'api_test_helper'
require 'test_instrumentor'
class ClustersControllerTest < ActionDispatch::IntegrationTest
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

    @empty_study = FactoryBot.create(:detached_study, name: 'Empty Cluster Study')
    @user2 =  FactoryBot.create(:api_user)
  end

  after(:all) do
    @basic_study.destroy
    @empty_study.destroy
    @user.destroy
    @user2.destroy
  end

  test 'enforces view permissions' do
    sign_in_and_update @user2
    execute_http_request(:get, api_v1_study_clusters_path(@basic_study), user: @user2)
    assert_equal 403, response.status

    execute_http_request(:get, api_v1_study_explore_cluster_options_path(@basic_study), user: @user2)
    assert_equal 403, response.status
  end

  test 'index should return list of cluster names' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_clusters_path(@basic_study))
    assert_equal ["clusterA.txt"], json

    execute_http_request(:get, api_v1_study_clusters_path(@empty_study))
    assert_equal [], json
  end

  test 'show should return visualization information' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_cluster_path(@basic_study, 'clusterA.txt'))
    assert_equal 3, json['numPoints']
    assert_equal ["cat (1 points)", "dog (2 points)"], json['data'].map{|d| d['name']}
    assert_equal false, json['is3D']
    dog_data = json['data'].find{|d| d['name'] == 'dog (2 points)'}
    assert_equal [1, 6], dog_data['x']
  end
end
