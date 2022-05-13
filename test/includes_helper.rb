require 'api_test_helper'

class ActionDispatch::IntegrationTest
  include ::Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor
  include ::Devise::Test::IntegrationHelpers
  include ::Requests::JsonHelpers
  include ::Requests::HttpHelpers
end

class ActionController::TestCase
  include ::Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor
  include ::Devise::Test::ControllerHelpers
end
