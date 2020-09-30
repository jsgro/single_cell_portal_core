# require 'open-uri'
# require 'net/https'
# require 'httpclient'

# module Net
#   class HTTP
#     alias_method :original_use_ssl=, :use_ssl=

#     def use_ssl=(flag)
#       store = OpenSSL::X509::Store.new
#       store.set_default_paths

#       # store.add_cert(OpenSSL::X509::Certificate.new(File.read("#{Rails.root}/config/ssl/root.crt")))
#       # store.add_cert(OpenSSL::X509::Certificate.new(File.read("#{Rails.root}/config/ssl/intermediate.crt")))
#       store.add_cert(OpenSSL::X509::Certificate.new(File.read(ENV['BURP_CERT'])))

#       self.cert_store = store

#       self.verify_mode = OpenSSL::SSL::VERIFY_PEER
#       self.original_use_ssl = flag

#       puts "ssl.rb: added #{ENV['BURP_CERT']}"
#       # https.ca_file = ENV['SSL_CERT_FILE']
#       # puts "application.rb: new https.ca_file = #{https.ca_file}"
#     end
#   end
# end

# class HTTPClient
#   def initialize(*args, &block)
#     self.ssl_config.set_trust_ca(ENV['BURP_CERT'])
#     super
#   end
# end
