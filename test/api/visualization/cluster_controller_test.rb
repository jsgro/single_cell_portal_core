require 'api_test_helper'

class ClusterControllerTest < ActionDispatch::IntegrationTest
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

    @basic_study = FactoryBot.create(:detached_study, name: 'Basic Cluster Study')
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
  end

  teardown do
    @basic_study.destroy
    @empty_study.destroy
    @user.destroy
  end

  test 'should get basic cluster, with metadata annotation by default' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"


    assert_equal 4, @basic_study.default_cluster.data_arrays.count

    execute_http_request(:get, api_v1_study_clusters_path(@basic_study))
    assert_equal 3, json['numPoints']
    assert_equal ["cat (1 points)", "dog (2 points)"], json['data'].map{|d| d['name']}

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should 404 with no default cluster' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    execute_http_request(:get, api_v1_study_clusters_path(@empty_study))
    assert_equal 404, response.status
    expected_error = {"error"=>"No default cluster exists"}
    assert_equal expected_error, json

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
