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

        swagger_path '/studies/{study_id}/explore' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Basic study visualization information'
            key :description, 'Returns overview of visualization properties for the given study'
            key :operationId, 'api_v1_studies_explore_path'
            parameter do
              key :name, :study_id
              key :in, :path
              key :description, 'ID of Study'
              key :required, true
              key :type, :string
            end
            response 200 do
              key :description, 'Json of study visualization properties'
            end
            response 401 do
              key :description, ApiBaseController.unauthorized
            end
            response 403 do
              key :description, ApiBaseController.forbidden('edit Study')
            end
            response 404 do
              key :description, ApiBaseController.not_found(Study)
            end
            response 406 do
              key :description, ApiBaseController.not_acceptable
            end
          end
        end

=begin
        isClusterViewable {Boolean}: Whether clusters can be visualized

        taxonNames {Array} List of species scientific names

        hasIdeogramInferCnvFiles {Boolean}: Whether ideogram files are present

        ideogramInferCNVFiles {Array}: List of ideogram annotation files for inferCNV


        uniqueGenes (Array): List of unique gene names, for e.g. autocomplete


        ---

        clusterPointAlpha {Float}: opacity of cluster points in this study

        clusterGroupNames {Array}: all possible cluster groups for a study
=end

        def show
          default_cluster = @study.default_cluster
          ideogram_study_file_names = StudyFile.where(study: @study, file_type: 'Ideogram Annotations').pluck(:name)

          explore_props = {
            isClusterViewable: default_cluster.present?,
            taxonNames: @study.expressed_taxon_names,
            hasIdeogramInferCnvFiles: ideogram_study_file_names.any?,
            ideogramInferCNVFiles: ideogram_study_file_names,
            uniqueGenes: @study.unique_genes,
            clusterGroupNames: ExpressionVizService.load_cluster_group_options(@study),
            spatialGroupNames: ExpressionVizService.load_spatial_options(@study),
            clusterPointAlpha: @study.default_cluster_point_alpha
          }

          render json: explore_props
        end

      end
    end
  end
end
