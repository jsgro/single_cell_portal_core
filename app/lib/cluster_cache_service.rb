##
# For pre-caching cluster visualization responses to speed up loading default responses
##
class ClusterCacheService
  # return the output from a url_helper, such as api_v1_study_cluster_path(study, cluster_name)
  #
  # * *params*
  #   - +route_name+ (String, Symbol) => name of route from routes.rb (as: declaration)
  #   - +params+ (*Array) => request parameters, supports path-level and query string (as Hash), passed with splat (*)
  #
  # * *returns*
  #   - (String) => Request path with all parameters interpolated in
  def self.format_request_path(route_name, *params)
    Rails.application.routes.url_helpers.send(route_name, *params)
  end

  # pre-cache all default clusters/annotations for every study
  def self.cache_all_defaults
    Study.all.map {|study| cache_study_defaults(study) }
  end

  # pre-cache the default cluster & annotation for a given study
  #
  # * *params*
  #   - +study+ (Study) => study to cache defaults for
  #
  # * *yields*
  #   - (JSON) => ActionDispatch::Cache entry of JSON viz data
  def self.cache_study_defaults(study)
    Rails.logger.info "Checking defaults on #{study.accession} for pre-caching"
    begin
      cluster = study.default_cluster
      annotation = study.default_annotation
      if cluster && annotation
        annotation_name, annotation_type, annotation_scope = annotation.split('--')
        # necessary for legacy cluster names that could contain slashes and other non URL-safe characters
        sanitized_cluster_name = cluster.name.include?('/') ? CGI.escape(cluster.name) : cluster.name
        full_params = {
          annotation_name: annotation_name, annotation_scope: annotation_scope, annotation_type: annotation_type,
          subsample: 'all', cluster_name: sanitized_cluster_name, fields: 'coordinates,cells,annotation'
        }
        default_params = {
          cluster_name: '_default',
          fields: 'coordinates,cells,annotation'
        }
        [default_params, full_params].each do |url_params|
          path = format_request_path(:api_v1_study_cluster_path, study.accession, url_params[:cluster_name])
          cache_path = RequestUtils.get_cache_path(path, url_params.with_indifferent_access)
          viz_data = Api::V1::Visualization::ClustersController.get_cluster_viz_data(study, cluster, url_params)
          Rails.logger.info "Pre-caching viz data for #{cache_path}"
          Rails.cache.write(cache_path, viz_data.to_json)
        end
      else
        Rails.logger.info "No defaults present for #{study.accession}; skip caching study defaults"
      end
    rescue => e
      ErrorTracker.report_exception(e, nil, study)
      Rails.logger.error "Error in caching defaults for #{study.accession}: (#{e.class.name}) #{e.message}"
    end
  end
end
