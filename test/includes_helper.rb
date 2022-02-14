class ActionDispatch::IntegrationTest
  include ::Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor
  include ::Devise::Test::IntegrationHelpers
end

class ActionController::TestCase
  include ::Minitest::Hooks
  include ::SelfCleaningSuite
  include ::TestInstrumentor
  include ::Devise::Test::ControllerHelpers
end
