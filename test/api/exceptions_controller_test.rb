require 'api_test_helper'
require 'test_helper'
require 'includes_helper'

class ExceptionsControllerTest < ActionDispatch::IntegrationTest
  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'ExceptionsController test',
                               user: @user,
                               test_array: @@studies_to_clean)
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
