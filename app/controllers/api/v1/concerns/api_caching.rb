module Api
  module V1
    module Concerns
      module ApiCaching
        extend ActiveSupport::Concern

        # list of parameters to reject from :get_cache_key as they will be represented by request.fullpath
        # format is always :json and therefore unnecessary
        CACHE_PATH_BLACKLIST = %w(controller action format study_id)

        included do
          before_action :check_api_cache!
          after_action :write_api_cache!
        end

        # check Rails cache for JSON response based off url/params
        # cache expiration is still handled by CacheRemovalJob
        def check_api_cache!
          cache_path = get_cache_key
          if Rails.cache.exist?(cache_path)
            Rails.logger.info "Reading from API cache: #{cache_path}"
            json_response = Rails.cache.fetch(cache_path)
            render json: json_response and return
          end
        end

        # write to the cache after a successful response
        def write_api_cache!
          cache_path = get_cache_key
          unless Rails.cache.exist?(cache_path)
            Rails.logger.info "Writing to API cache: #{cache_path}"
            Rails.cache.write(cache_path, response.body)
          end
        end

        private

        # construct cache_key for accessing Rails cache
        def get_cache_key
          # transform / into _ to avoid encoding as %2f
          sanitized_path = request.fullpath.gsub(/\//, '_')
          # remove unwanted parameters from cache_key, as well as empty values
          # this simplifies base key into smaller value, e.g. _single_cell_api_v1_studies_SCP123_explore_
          params_key = params.to_unsafe_hash.reject {|name, value| CACHE_PATH_BLACKLIST.include?(name) || value.empty?}.
              map do |parameter_name, parameter_value|
            "#{parameter_name}_#{parameter_value.split.join('-')}"
          end
          [sanitized_path, params_key].join('_')
        end
      end
    end
  end
end
