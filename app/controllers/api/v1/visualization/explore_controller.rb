module Api
  module V1
    module Visualization
      # aggregation controller for data needed for initial study visualization display
      class ExploreController < ApiBaseController
        include Concerns::Authenticator
        include Concerns::StudyAware
        include Swagger::Blocks

        before_action :set_current_api_user!
        before_action :set_study
        before_action :check_study_view_permission

=begin
        isClusterViewable {Boolean}: Whether clusters can be visualized

        taxonNames {Array} List of species scientific names

        hasIdeogramInferCnvFiles {Boolean}: Whether ideogram files are present

        ideogramInferCNVFiles {Array}: List of ideogram annotation files for inferCNV


        uniqueGenes (Array): List of unique gene names, for e.g. autocomplete


        ---

        clusterPointAlpha {Float}: opacity of cluster points in this study

        clusterGroupOptions {Object}: all possible cluster groups for a study

        Legacy response props that are omitted in this proposal, as they are better handled client-side:


        renderClusterPath, getNewAnnotationsPath
=end

        def show
          default_cluster = @study.default_cluster
          default_annotation =
          explore_props = {
            is_cluster_viewable: default_cluster.nil?,
            taxon_names: [],
            hasIdeogramInferCnvFiles: false,
            uniqueGenes: [],
            clusterGroupOptions: []
          }

          render json: explore_props
        end

      end
    end
  end
end
