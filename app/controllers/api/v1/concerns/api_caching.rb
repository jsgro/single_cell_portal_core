module Api
  module V1
    module Concerns
      module ApiCaching
        extend ActiveSupport::Concern

        # list of parameters to reject from :get_cache_key as they will be represented by request.path
        # format is always :json and therefore unnecessary
        CACHE_PATH_BLACKLIST = %w(controller action format study_id)

        # character regex to convert into underscores (_) for cache path setting
        PATH_REGEX =/(\/|%2C|%2F|%20|\?|&|=|\.|,|\s)/

        # check Rails cache for JSON response based off url/params
        # cache expiration is still handled by CacheRemovalJob
        def check_api_cache!
          cache_path = RequestUtils.get_cache_path(request.path, params.to_unsafe_hash)
          Rails.logger.info "Rails.cache"
          Rails.logger.info Rails.cache
          Rails.logger.info "Rails.cache.stats"
          Rails.logger.info Rails.cache.stats
          if check_caching_config && Rails.cache.exist?(cache_path)
            Rails.logger.info "Reading from API cache: #{cache_path}"
            json_response = Rails.cache.fetch(cache_path)
            render json: json_response
          end
        end

        # write to the cache after a successful response
        def write_api_cache!
          cache_path = RequestUtils.get_cache_path(request.path, params.to_unsafe_hash)
          if check_caching_config && !Rails.cache.exist?(cache_path)
            if Rails.cache.instance_variable_get(:@data).size == 0
              Rails.logger.info "Warming default cluster cache"
              ClusterCacheService.cache_all_defaults
            else
              Rails.logger.info "Writing to API cache: #{cache_path}"
              Rails.cache.write(cache_path, response.body)
            end
          end
        end

        private

        # check if caching is enabled/disabled in development environment
        # will always return true in all other environments
        def check_caching_config
          if Rails.env.development?
            Rails.root.join('tmp/caching-dev.txt').exist?
          else
            true
          end
        end
      end
    end
  end
end
