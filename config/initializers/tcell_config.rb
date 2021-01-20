# configure server-side integration for tcell_agent
if defined?(TCellAgent) && ENV['TCELL_AGENT_APP_ID'].present? && ENV['T_CELL_SERVER_AGENT_API_KEY'].present?
  TCellAgent.configure do |config|
    config.app_id = "#{ENV['TCELL_AGENT_APP_ID']}"
    config.api_key = "#{ENV['T_CELL_SERVER_AGENT_API_KEY']}"
    config.logging_options = {"enabled" => true, "level" => Rails.env == 'development' ? "DEBUG" : "INFO"}
  end
end
