require 'test_helper'
require 'api_test_helper'

class ClustersControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name: 'Basic Cluster Study',
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

  test 'enforces view permissions' do
    user2 = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    sign_in_and_update user2
    execute_http_request(:get, api_v1_study_clusters_path(@basic_study), user: user2)
    assert_equal 403, response.status

    execute_http_request(:get, api_v1_study_explore_cluster_options_path(@basic_study), user: user2)
    assert_equal 403, response.status

    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_cluster_path(@basic_study))
    assert_equal 200, response.status

    execute_http_request(:get, api_v1_study_explore_cluster_options_path(@basic_study))
    assert_equal 200, response.status
  end

  test 'index should return list of cluster names' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_clusters_path(@basic_study))
    assert_equal ["clusterA.txt"], json

    empty_study = FactoryBot.create(:detached_study,
                                    name: 'Empty Cluster Study',
                                    test_array: @@studies_to_clean)
    execute_http_request(:get, api_v1_study_clusters_path(empty_study))
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

  test 'should load clusters with slashes in name' do
    slash_study = FactoryBot.create(:detached_study,
                                    name: 'Cluster Slash Study',
                                    test_array: @@studies_to_clean)
    cluster_with_slash = FactoryBot.create(:cluster_file,
                                           name: 'data/cluster_with_slash.txt',
                                           study: slash_study,
                                           cell_input: {
                                             x: [1, 2 , 3, 4],
                                             y: [5, 6, 7, 8],
                                             cells: %w(A B C D)
                                           },
                                           annotation_input: [{name: 'category', type: 'group', values: ['bar', 'bar', 'baz', 'bar']}])

    # slash must be URL encoded with %2F, and URL constructed manually as the path helper cannot resolve cluster_name param
    # with a slash due to the route constraint of {:cluster_name=>/[^\/]+/}; using route helper api_v1_study_cluster_path()
    # with the params of cluster_name: 'data/cluster_with_slash.txt' or cluster_name: 'data%2Fcluster_with_slash' does not work
    cluster_name = 'data%2Fcluster_with_slash.txt'
    basepath = "/single_cell/api/v1/studies/#{slash_study.accession}/clusters/#{cluster_name}"
    query_string = '?annotation_name=category&annotation_type=group&annotation_scope=cluster'
    url = basepath + query_string
    execute_http_request(:get, url)
    assert_response :success
    assert_equal 4, json['numPoints']
    expected_annotations = ["bar (3 points)", "baz (1 points)"]
    loaded_annotations = json['data'].map {|d| d['name'] }
    assert_equal expected_annotations, loaded_annotations

    # assert that non-encoded cluster names do not load correct cluster
    # using path helper here results in cluster_name not being decoded properly by clusters_controller.rb
    # and is interpreted literally as data%2Fcluster_with_slash.txt, rather than data/cluster_with_slash.txt
    execute_http_request(:get, api_v1_study_cluster_path(slash_study.accession, cluster_name,
                                                         annotation_name: 'category', annotation_type: 'group',
                                                         annotation_scope: 'cluster'))
    assert_response :not_found
    expected_error = {"error"=>"No cluster named data%2Fcluster_with_slash.txt could be found"}
    assert_equal expected_error, json
  end
end
