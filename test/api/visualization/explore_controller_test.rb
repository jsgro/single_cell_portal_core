require 'test_helper'
require 'api_test_helper'

class ExploreControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers
  include Minitest::Hooks
  include TestInstrumentor
  include SelfCleaningSuite

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Basic Explore',
                                     public: false,
                                     user: @user,
                                     test_array: @@studies_to_clean)
    @basic_study_cluster_file = FactoryBot.create(:cluster_file,
                                                  name: 'clusterA.txt',
                                                  file_type: 'Cluster',
                                                  study: @basic_study,
                                                  annotation_input: [{name: 'foo', type: 'group', values: ['bar', 'bar', 'baz']}])

    @spatial_study_cluster_file = FactoryBot.create(:cluster_file,
                                                    name: 'spatialA.txt',
                                                    file_type: 'Cluster',
                                                    study: @basic_study,
                                                    is_spatial: true)

    @empty_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Empty study',
                                     test_array: @@studies_to_clean)
  end

  teardown do
    OmniAuth.config.mock_auth[:google] = nil
  end

  test 'should enforce view permissions' do
    user2 =  FactoryBot.create(:api_user, test_array: @@users_to_clean)
    sign_in_and_update user2
    execute_http_request(:get, api_v1_study_explore_path(@basic_study), user: user2)
    assert_equal 403, response.status

    execute_http_request(:get, cluster_options_api_v1_study_explore_path(@basic_study), user: user2)
    assert_equal 403, response.status

    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_explore_path(@basic_study))
    assert_equal 200, response.status

    execute_http_request(:get, cluster_options_api_v1_study_explore_path(@basic_study))
    assert_equal 200, response.status
  end

  test 'should get basic study visualization data' do
    sign_in_and_update @user
    execute_http_request(:get, api_v1_study_explore_path(@basic_study))
    assert_response :success

    assert_equal ['clusterA.txt'], json['clusterGroupNames']
    assert_equal [{"name" => 'spatialA.txt', "associated_clusters" => []}], json['spatialGroups']

    execute_http_request(:get, api_v1_study_explore_path(@empty_study))
    assert_equal [], json['clusterGroupNames']
  end

  test 'should get annotation listings' do
    sign_in_and_update @user
    execute_http_request(:get, cluster_options_api_v1_study_explore_path(@basic_study))
    assert_response :success

    assert_equal 'clusterA.txt', json['default_cluster']
    expected_annotations = [{"name"=>"foo", "type"=>"group", "values"=>["bar", "baz"], "scope"=>"cluster", "cluster_name"=>"clusterA.txt"}]
    assert_equal expected_annotations, json['annotations']
    assert_equal({"clusterA.txt"=>[], "spatialA.txt"=>[]}, json['subsample_thresholds'])

    execute_http_request(:get, cluster_options_api_v1_study_explore_path(@empty_study))
    assert_equal [], json['annotations']
  end


  test 'should handle invalid study id' do
    sign_in_and_update @user
    execute_http_request(:get, cluster_options_api_v1_study_explore_path('SCP1234567'))
    assert_equal 404, response.status
  end
end
