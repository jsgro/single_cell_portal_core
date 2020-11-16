require 'api_test_helper'

class ExploreControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers

  setup do
    @user = FactoryBot.create(:api_user)
    OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new({
                                                                           :provider => 'google_oauth2',
                                                                           :uid => '123545',
                                                                           :email => 'testing.user@gmail.com'
                                                                       })
    sign_in @user
    @user.update_last_access_at! # ensure user is marked as active

    @basic_study = FactoryBot.create(:detached_study, name: 'Basic Explore')
    @basic_study_cluster_file = FactoryBot.create(:study_file,
                                                  name: 'clusterA.txt',
                                                  file_type: 'Cluster',
                                                  study: @basic_study)
    @cluster_group = FactoryBot.create(:cluster_group_with_cells,
                                       study_file: @basic_study_cluster_file,
                                       cell_data: {
                                         x: [1, 4 ,6],
                                         y: [7, 5, 3],
                                         cells: ['A', 'B', 'C']
                                       })
    @spatial_study_cluster_file = FactoryBot.create(:study_file,
                                                  name: 'spatialA.txt',
                                                  file_type: 'Cluster',
                                                  study: @basic_study,
                                                  is_spatial: true)
    @spatial_group = FactoryBot.create(:cluster_group_with_cells,
                                       study_file: @spatial_study_cluster_file,
                                       cell_data: {
                                         x: [0, 1, 3],
                                         y: [8, 6, 4],
                                         cells: ['A', 'B', 'C']
                                       })
  end

  teardown do
    @basic_study.destroy
    @user.destroy
  end

  test 'should get basic study visualization data' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"


    assert_equal 3, @basic_study.default_cluster.data_arrays.count

    execute_http_request(:get, api_v1_study_explore_path(@basic_study))
    assert_response :success
    assert json['isClusterViewable']
    assert_equal ['clusterA.txt'], json['clusterGroupNames']
    assert_equal ['spatialA.txt'], json['spatialGroupNames']
    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
