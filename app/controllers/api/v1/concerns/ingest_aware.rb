module Api
  module V1
    module Concerns
      module IngestAware
        extend ActiveSupport::Concern
        INGEST_IMAGE_NAME = 'scp-ingest-pipeline'
        MANAGE_STUDY_NAME = 'single-cell-portal'
        SCP_PACKAGES = [INGEST_IMAGE_NAME, MANAGE_STUDY_NAME]

        included do
          before_action :validate_scp_user_agent!
        end

        # deny connections that declare they are from the single-cell-portal PyPI package and are using a
        # version of scp-ingest-pipeline that is not the current major release
        #
        # Examples:
        # 'User-Agent': 'single-cell-portal/0.1.3rc1 (manage-study) scp-ingest-pipeline/1.5.6 (ingest_pipeline.py)'
        # If the configured version of scp-ingest-pipeline is... (the response will be)
        #  * 0.x = the request is denied with 400: Bad Request
        #  * 1.x = the request is allowed to proceed
        #  * 2.x = the request is denied with 400: Bad Request
        #  * scp-ingest-pipeline-development:ddee8f5 (untagged dev image) = request is denied since tags to not match
        #
        # All other requests without UA headers, or non SCP-specific UA headers are allowed
        def validate_scp_user_agent!
          scp_package_headers = extract_scp_user_agent_headers(request)
          if scp_package_headers.any?
            ingest_image_attributes = AdminConfiguration.get_ingest_docker_image_attributes
            ingest_pipeline_version = ingest_image_attributes[:tag]
            request_ingest_version = scp_package_headers[INGEST_IMAGE_NAME]
            if ingest_pipeline_version.include?('.') && request_ingest_version.include?('.')
              # both server & client are using a tagged release of scp-ingest-pipeline, so only compare major versions
              # otherwise fall back to checking entire tag for non-production releases
              ingest_pipeline_version = ingest_pipeline_version.split('.').first.try(:to_i)
              request_ingest_version = request_ingest_version.split('.').first.try(:to_i)
            end
            render json: {error: "scp-ingest-pipeline: #{scp_package_headers[INGEST_IMAGE_NAME]} incompatible with host, " + \
                                 "please use #{ingest_image_attributes[:tag]}"},
                   status: 400 and return if ingest_pipeline_version != request_ingest_version
          end
        end

        def extract_scp_user_agent_headers(request)
          agent = request.headers['User-Agent']
          scp_ua_headers = {}
          if agent.present?
            SCP_PACKAGES.each do |package|
              package_match = agent.match(/#{package}\/(\w|\.)+/)
              scp_ua_headers[package] = package_match.to_s.split('/').last if package_match
            end
          end
          scp_ua_headers
        end
      end
    end
  end
end
