module RealIpLogger
  ##
  # real_ip_logger.rb: logs the actual client IP address set by the nginx X-Real-Ip header, instead of load balancer ip
  # see http://nginx.org/en/docs/http/ngx_http_realip_module.html for more info on associated nginx module
  # and webapp.conf for configuration
  ##

  extend ActiveSupport::Concern

  included do
    around_action :log_real_ip
  end

  def log_real_ip
    real_ip = request.headers['HTTP_X_REAL_IP']
    Rails.logger.info "Real client IP: #{real_ip} for #{request.method} #{request.fullpath}" if real_ip.present?
    remote_ip = request.remote_ip
    Rails.logger.info "Remote client IP: #{remote_ip} for #{request.method} #{request.fullpath}" if remote_ip.present?
  ensure
    yield # regardless of any issues/errors, request will always execute and render a response
  end
end

