# log remote IP header to application logs
# mirrors settings in webapp.conf to log x-forwarded-for header as request IP in access log
# from https://stackoverflow.com/questions/20124292/how-to-log-real-client-ip-in-rails-log-when-behind-proxy-like-nginx
class RemoteIpLogger
  def initialize(app)
    @app = app
  end

  def call(env)
    remote_ip = env["action_dispatch.remote_ip"]
    Rails.logger.info "Remote IP: #{remote_ip}" if remote_ip
    @app.call(env)
  end
end
