require 'test_helper'

class User::OmniauthCallbacksControllerTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  setup do
    @google_params = { scope: SingleCellPortal::Application::BASIC_GOOGLE_SCOPES.join(' ') }
  end

  test 'should validate basic scopes from params' do
    assert_nothing_raised do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_params)
    end

    @google_params[:scope] += ' devstorage.readonly'

    assert_raise SecurityError do
      Users::OmniauthCallbacksController.validate_scopes_from_params(@google_params)
    end
  end
end
