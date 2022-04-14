class EncodeAzulFilesNames < Mongoid::Migration
    def self.up
      download_reqs = DownloadRequest.where(:azul_files.ne => nil)
      download_reqs.each do |req|
        encoded_azul_files = ActiveSupport::JSON.encode(req.azul_files)
        req.update(azul_files: encoded_azul_files)
      end
    end
  
    def self.down
    download_reqs = DownloadRequest.where(:azul_files.ne => nil)
    download_reqs.each do |req|
      azul_files_as_hash = ActiveSupport::JSON.decode(req.azul_files.gsub('=>', ':'))
      req.update(azul_files: azul_files_as_hash)
      end
    end
  end
  