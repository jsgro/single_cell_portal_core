require 'api_test_helper'

class ExploreControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers
  include Requests::JsonHelpers
  include Requests::HttpHelpers

  setup do
    @user = User.find_by(email: 'testing.user.2@gmail.com')
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
                                         text: ['A', 'B', 'C']
                                       })
  end

  teardown do
    @basic_study.destroy
  end

  test 'should get basic study visualization data' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"


    assert_equal 3, @basic_study.default_cluster.data_arrays.count

    # controller not yet implemented

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
