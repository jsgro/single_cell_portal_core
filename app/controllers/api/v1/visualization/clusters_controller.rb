module Api
  module V1
    module Visualization
      # API methods for visualizing cluster data
      # does NOT contain methods for editing clusters
      class ClustersController < ApiBaseController
        include Concerns::Authenticator
        include Concerns::StudyAware
        include Concerns::ApiCaching
        include Swagger::Blocks

        VALID_SCOPE_VALUES = ['study', 'cluster']
        VALID_TYPE_VALUES = ['group', 'numeric']
        VALID_CONSENSUS_VALUES = ['mean', 'median']

        before_action :set_current_api_user!
        before_action :set_study
        before_action :check_study_view_permission
        before_action :check_api_cache!
        after_action :write_api_cache!

        # shared
        cluster_param_docs = [{
            name: :accession,
            in: :path,
            description: 'Accession of study',
            required: true,
            type: :string
          },
          {
            name: :annotation_name,
            in: :path,
            description: 'Name of annotation, as defined in cluster file',
            type: :string
          },
          {
            name: :annotation_type,
            in: :query,
            description: 'Type of annotation.  One of “group” or “numeric”.',
            type: :string,
            enum: VALID_TYPE_VALUES
          },
          {
            name: :annotation_scope,
            in: :query,
            description: 'Scope of annotation.   One of “study” or “cluster”.',
            type: :string,
            enum: VALID_SCOPE_VALUES
          },
          {
            name: :subsample,
            in: :query,
            description: 'Number of cells to use as subsample threshold.  Omit parameter if not subsampling (i.e. if threshold is “all cells”).',
            type: :string
          },
          {
            name: :consensus,
            in: :query,
            description: 'Statistic to use for consensus, e.g. "mean".  Omit parameter if not applying consensus.',
            type: :string,
            enum: VALID_CONSENSUS_VALUES
          },
          {
            name: :is_annotated_scatter,
            in: :query,
            description: 'Whether plot is an "Annotated Scatter", i.e. an annotation-based data array scatter plot.',
            type: :string
          }]

        cluster_response_docs = [
          {code: 200, description: 'Cluster visualization json object'},
          {code: 401, description: ApiBaseController.unauthorized},
          {code: 403, description: ApiBaseController.forbidden('view study')},
          {code: 404, description: ApiBaseController.not_found(Study)},
          {code: 406, description: ApiBaseController.not_acceptable},
        ]

        swagger_path '/studies/{accession}/clusters' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get the default cluster and its sub-clusters for a study'
            key :description, 'Get the default cluster group and its constituent cluster annotations'
            key :operationId, 'study_clusters_path'
            cluster_param_docs.each { |doc| parameter(doc) }
            cluster_response_docs.each { |doc| response doc[:code], doc }
          end
        end

        # note that 'index' returns the default cluster, rather than a list of all clusters
        # see the 'show' method for documentation of the return type
        def index
          cluster = @study.default_cluster
          if cluster.nil?
            render json: {error: 'No default cluster exists'}, status: 404 and return
          end
          viz_data = self.class.get_cluster_viz_data(@study, cluster, params)

          if viz_data.nil?
            render json: {error: 'Annotation could not be found'}, status: 404 and return
          end
          render json: viz_data
        end

        swagger_path '/studies/{accession}/clusters/{cluster_name}' do
          operation :get do
            key :tags, [
                'Visualization'
            ]
            key :summary, 'Get a cluster and its sub-clusters for a study'
            key :description, 'Get the cluster group and its constituent cluster annotations'
            key :operationId, 'study_cluster_path'
            parameter({
              name: :cluster_name,
              in: :path,
              description: 'Name of cluster group',
              required: true,
              type: :string
            })
            cluster_param_docs.each { |doc| parameter(doc) }
            cluster_response_docs.each { |doc| response doc[:code], doc }
          end
        end

        def show
          # this endpoint requires a cluster to be specified -- index is used to fetch the default
          cluster = @study.cluster_groups.find_by(name: params[:cluster_name])
          if cluster.nil?
            render json: {error: "No cluster named #{params[:cluster_name]} could be found"}, status: 404 and return
          end
          viz_data = self.class.get_cluster_viz_data(@study, cluster, params)
          if viz_data.nil?
            render json: {error: 'Annotation could not be found'}, status: 404 and return
          end
          render json: viz_data
        end

        # packages up a bunch of calls to rendering service endpoints for a response object
        def self.get_cluster_viz_data(study, cluster, url_params)
          annot_params = {
            name: url_params[:annotation_name].blank? ? nil : url_params[:annotation_name],
            type: url_params[:annotation_type].blank? ? nil : url_params[:annotation_type],
            scope: url_params[:annotation_scope].blank? ? nil : url_params[:annotation_scope]
          }
          annotation = ExpressionVizService.get_selected_annotation(study,
                                                                    cluster,
                                                                    annot_params[:name],
                                                                    annot_params[:type],
                                                                    annot_params[:scope])
          if !annotation
            return nil
          end

          subsample = url_params[:subsample].blank? ? nil : url_params[:subsample].to_i

          colorscale = url_params[:colorscale].blank? ? 'Reds' : url_params[:colorscale]

          is_annotated_scatter = !url_params[:is_annotated_scatter].blank?

          gene_name = url_params[:gene]
          if gene_name.blank?
            # For "Clusters" tab in default view of Explore tab
            coordinates = ClusterVizService.load_cluster_group_data_array_points(study, cluster, annotation, subsample, colorscale)
          else
            # For single-gene view of Explore tab
            gene = study.genes.by_name_or_id(gene_name, study.expression_matrix_files.map(&:id))
            title = ExpressionVizService.load_expression_axis_title(study)
            if is_annotated_scatter
              # For "Annotated scatter" tab, shown in first tab for numeric annotations
              coordinates = ExpressionVizService.load_annotation_based_data_array_scatter(study, gene, cluster, annotation, subsample, title)
            else
              # For "Scatter" tab
              coordinates = ExpressionVizService.load_expression_data_array_points(study, gene, cluster, annotation, subsample, title, colorscale)
            end
          end

          plot_data = ClusterVizService.transform_coordinates(coordinates, study, cluster, annotation)

          if cluster.is_3d?
            range = ClusterVizService.set_range(cluster, coordinates.values)
            if cluster.has_range?
              aspect = ClusterVizService.compute_aspect_ratios(range)
            end
          end

          titles = ClusterVizService.load_axis_labels(cluster)

          axes_full = {
            titles: titles,
            ranges: range,
            aspects: aspect
          }

          coordinate_labels = ClusterVizService.load_cluster_group_coordinate_labels(cluster)
          {
            "data": plot_data,
            "description": cluster.study_file.description,
            "is3D": cluster.is_3d?,
            "isSubsampled": cluster.subsampled?,
            "numPoints": cluster.points,
            "domainRanges": cluster.domain_ranges,
            "axes": axes_full,
            "hasCoordinateLabels": cluster.has_coordinate_labels?,
            "coordinateLabels": coordinate_labels,
            "cluster": cluster.name,
            "gene": gene_name,
            "annotParams": annot_params
          }
        end
      end
    end
  end
end
