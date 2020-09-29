require 'open-uri'
require 'net/https'

module Net
  class HTTP
    alias_method :original_use_ssl=, :use_ssl=

    def use_ssl=(flag)
      store = OpenSSL::X509::Store.new
      store.set_default_paths

      # store.add_cert(OpenSSL::X509::Certificate.new(File.read("#{Rails.root}/config/ssl/root.crt")))
      # store.add_cert(OpenSSL::X509::Certificate.new(File.read("#{Rails.root}/config/ssl/intermediate.crt")))
      store.add_cert(OpenSSL::X509::Certificate.new(File.read(ENV['SSL_CERT_FILE'])))

      self.cert_store = store

      self.verify_mode = OpenSSL::SSL::VERIFY_PEER
      self.original_use_ssl = flag

      puts "ssl.rb: added #{ENV['SSL_CERT_FILE']}"
      # https.ca_file = ENV['SSL_CERT_FILE']
      # puts "application.rb: new https.ca_file = #{https.ca_file}"
    end
  end
end
