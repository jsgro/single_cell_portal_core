require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
# require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
# require "action_cable/engine"
require "sprockets/railtie"
require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SingleCellPortal
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 6.1

    config.time_zone = 'Eastern Time (US & Canada)'

    config.middleware.use Rack::Brotli

    # Docker image for file parsing via scp-ingest-pipeline
    config.ingest_docker_image = 'gcr.io/broad-singlecellportal-staging/scp-ingest-pipeline:1.11.0'

    # Terra Data Repo API base url
    config.tdr_api_base_url = 'https://jade-terra.datarepo-prod.broadinstitute.org/'

    config.autoload_paths << Rails.root.join('lib')

    # Google OAuth2 Scopes
    # basic scopes are user profile, email, and openid, and do not require user consent to request during auth handshake
    BASIC_GOOGLE_SCOPES = %w(email profile userinfo.email userinfo.profile openid)

    # extended scopes add cloud-billing.readonly which requires user consent
    # these are only requested when users attempt to visit the "My Billing Projects" page
    EXTENDED_GOOGLE_SCOPES = BASIC_GOOGLE_SCOPES.dup + %w(cloud-billing.readonly)
  end
end
