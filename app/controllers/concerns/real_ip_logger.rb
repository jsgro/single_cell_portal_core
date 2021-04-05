module RealIpLogger
  ##
  # real_ip_logger.rb: logs the actual client IP address set by the nginx X-Forwarded-For header, instead of load balancer ip
  ##

  extend ActiveSupport::Concern

  included do
    around_action :log_real_ip
  end

  def log_real_ip
    real_ip = request.headers['HTTP_X_FORWARDED_FOR']
    Rails.logger.info "Forwarded client IP: #{real_ip} for #{request.method} #{request.fullpath}" if real_ip.present?
  ensure
    yield # regardless of any issues/errors, request will always execute and render a response
  end
end

