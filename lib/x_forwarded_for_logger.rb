# x_forwarded_for_logger.rb
#
# logs entire X-Forwarded-For header on requests, if present.  This is because Rails only returns the last IP address
# reported in various headers as it considers this to be the most authoritative, and least likely to be spoofed.  Since
# GCP reports the load balancer IP last, this is what always shows up in the logs.  This class will log the entire
# header value to the application log before logging the request as norma, which will mirror the behavior of nginx when
# using real_ip_header and $proxy_add_x_forwarded_for.
#
# More info:
# https://github.com/rails/rails/issues/39092
# https://api.rubyonrails.org/classes/ActionDispatch/RemoteIp.html
# https://cloud.google.com/load-balancing/docs/https#x-forwarded-for_header
# http://nginx.org/en/docs/http/ngx_http_realip_module.html

class XForwardedForLogger
  def initialize app
    @app = app
  end

  def call(env)
    forwarded_ips = env["HTTP_X_FORWARDED_FOR"]
    request_path = env["PATH_INFO"]
    request_method = env['REQUEST_METHOD']
    Rails.logger.info "Forwarded IPs: #{forwarded_ips} for #{request_method} #{request_path}" if forwarded_ips
    @app.call(env)
  end
end
