require 'api_test_helper'
require 'test_helper'
require 'includes_helper'

class ExceptionsControllerTest < ActionDispatch::IntegrationTest
  # overwrite configurations in test environment to allow exceptions_app to handle errors instead of defaults
  # these need to be overwritten only for this test as changing values in config/environments/test.rb can have
  # unexpected results for other tests, especially those that are asserting that exceptions are raised
  before(:all) do
    Rails.application.config.consider_all_requests_local = false
    Rails.application.config.action_dispatch.show_exceptions = true
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'ExceptionsController test',
                               user: @user,
                               test_array: @@studies_to_clean)
  end

  # reset custom config back to defaults
  after(:all) do
    Rails.application.config.consider_all_requests_local = true
    Rails.application.config.action_dispatch.show_exceptions = false
  end

  # ensure uncaught exceptions are handled and rendered as JSON responses
  test 'should render errors as json responses' do
    Api::V1::Visualization::AnnotationsController.stub :get_annotation_params, nil do
      execute_http_request(
        :get,
        api_v1_study_annotation_path(
          @study.accession, annotation_name: 'foo', annotation_type: 'group', annotation_scope: 'study'
        ),
        user: @user
      )
      assert_response :internal_server_error
      assert_equal 'NoMethodError', json['error_class']
      assert json['source'].include? 'get_selected_annotation'
    end
  end
end
