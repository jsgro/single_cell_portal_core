require 'test_helper'

class User::OmniauthCallbacksControllerTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  setup do
    @google_params = {scope:  SingleCellPortal::Application::BASIC_GOOGLE_SCOPES.join(' ')}
    @google_billing_params = {scope:  SingleCellPortal::Application::EXTENDED_GOOGLE_SCOPES.join(' ')}
  end

  test 'should validate basic scopes from params' do
    provider = 'google'

    assert_nothing_raised do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_params, provider)
    end

    @google_params[:scope] += ' devstorage.readonly'

    assert_raise SecurityError do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_params, provider)
    end
  end

  test 'should validate extended scopes from params' do
    provider = 'google_billing'

    assert_nothing_raised do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_billing_params, provider)
    end

    @google_billing_params[:scope] += ' devstorage.readonly'

    assert_raise SecurityError do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_billing_params, provider)
    end
  end

  test 'should validate host header on callback' do
    RequestUtils.stub :get_hostname, 'localhost:3000' do
      assert_nothing_raised do
        Users::OmniauthCallbacksController.validate_host_header_on_callback({'HTTP_HOST' => 'localhost:3000'})
      end

      %w(localhost localhost:12345 malicious.com).each do |host|
        invalid_headers = {'HTTP_HOST' => host}
        assert_raise SecurityError do
          Users::OmniauthCallbacksController.validate_host_header_on_callback(invalid_headers)
        end
      end
    end
  end
end
