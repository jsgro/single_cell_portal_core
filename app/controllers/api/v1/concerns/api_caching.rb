module Api
  module V1
    module Concerns
      module ApiCaching
        extend ActiveSupport::Concern

        # list of parameters to reject from :get_cache_key as they will be represented by request.path
        # format is always :json and therefore unnecessary
        CACHE_PATH_BLACKLIST = %w(controller action format study_id)

        # character regex to convert into underscores (_) for cache path setting
        PATH_REGEX =/(\/|%2F|%20|\?|&|=|\.)/

        # check Rails cache for JSON response based off url/params
        # cache expiration is still handled by CacheRemovalJob
        def check_api_cache!
          cache_path = get_cache_key
          if check_caching_config && Rails.cache.exist?(cache_path)
            Rails.logger.info "Reading from API cache: #{cache_path}"
            json_response = Rails.cache.fetch(cache_path)
            render json: json_response
          end
        end

        # write to the cache after a successful response
        def write_api_cache!
          cache_path = get_cache_key
          if check_caching_config && !Rails.cache.exist?(cache_path)
            Rails.logger.info "Writing to API cache: #{cache_path}"
            Rails.cache.write(cache_path, response.body)
          end
        end

        private

        # construct cache_key for accessing Rails cache
        def get_cache_key
          # transform / into _ to avoid encoding as %2f
          sanitized_path = sanitize_path
          # remove unwanted parameters from cache_key, as well as empty values
          # this simplifies base key into smaller value, e.g. _single_cell_api_v1_studies_SCP123_explore_
          params_key = params.to_unsafe_hash.reject {|name, value| CACHE_PATH_BLACKLIST.include?(name) || value.empty?}.
              map do |parameter_name, parameter_value|
            "#{parameter_name}_#{sanitize_param(parameter_value).split.join('_')}"
          end
          [sanitized_path, params_key].join('_')
        end

        # convert url pathname into easily readable fragment
        def sanitize_path
          request.path.gsub(PATH_REGEX, '_')
        end

        # remove url-encoded characters from parameter values
        def sanitize_param(parameter)
          parameter.gsub(PATH_REGEX, '_')
        end

        # check if caching is enabled/disabled in development environment
        # will always return true in all other environments
        def check_caching_config
          if Rails.env == 'development'
            Rails.root.join('tmp/caching-dev.txt').exist?
          else
            true
          end
        end
      end
    end
  end
end
