require 'test_helper'
require 'includes_helper'

class CacheManagementTest < ActionDispatch::IntegrationTest

  before(:all) do
    @user = FactoryBot.create(:user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Cache Test',
                               user: @user,
                               test_array: @@studies_to_clean)
    @study_cluster_file = FactoryBot.create(:cluster_file,
                                            name: 'cluster 1', study: @study,
                                            cell_input: {
                                              x: [1, 4, 6],
                                              y: [7, 5, 3],
                                              z: [2, 8, 9],
                                              cells: %w[A B C]
                                            },
                                            x_axis_label: 'PCA 1',
                                            y_axis_label: 'PCA 2',
                                            z_axis_label: 'PCA 3',
                                            cluster_type: '3d',
                                            annotation_input: [
                                              { name: 'Category', type: 'group', values: %w[bar bar baz] },
                                              { name: 'Intensity', type: 'numeric', values: [1.1, 2.2, 3.3] }
                                            ])

    @study_exp_file = FactoryBot.create(:expression_file,
                                        name: 'dense.txt',
                                        cell_input: %w[A B C],
                                        file_type: 'Expression Matrix',
                                        study: @study)

    @study_metadata_file = FactoryBot.create(:metadata_file,
                                             name: 'metadata.txt', study: @study,
                                             cell_input: %w[A B C],
                                             annotation_input: [
                                               { name: 'species', type: 'group', values: %w[dog cat dog] },
                                               { name: 'disease', type: 'group', values: %w[none none measles] }
                                             ])

    @pten_gene = FactoryBot.create(:gene_with_expression,
                                   name: 'PTEN',
                                   study_file: @study_exp_file,
                                   expression_input: [['A', 0], ['B', 3], ['C', 1.5]])
    @agpat2_gene = FactoryBot.create(:gene_with_expression,
                                     name: 'AGPAT2',
                                     study_file: @study_exp_file,
                                     expression_input: [['A', 0], ['B', 0], ['C', 8]])
    defaults = {
      cluster: 'cluster_1.txt',
      annotation: 'species--group--study'
    }
    @study.update(default_options: defaults)
  end

  def setup
    host! 'localhost'
  end

  def test_manage_cache_entries
    cluster = @study.cluster_groups.first
    cluster_underscore = cluster.name.split.join('_') # for API cache paths
    genes = @study.genes.map(&:name)
    genes_hash = Digest::SHA256.hexdigest genes.sort.join
    cluster.cell_annotations.each do |cell_annotation|
      annotation = "#{cell_annotation[:name]}--#{cell_annotation[:type]}--cluster"
      puts "Testing with annotation: #{annotation}"

      # get various actions subject to caching
      get api_v1_study_explore_path(study_id: @study.accession), as: :json
      get api_v1_study_clusters_path(study_id: @study.accession), as: :json
      get api_v1_study_cluster_path(study_id: @study.accession, annotation_name: cell_annotation[:name],
                                    annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                    cluster_name: cluster.name), as: :json
      get api_v1_study_expression_path(study_id: @study.accession, annotation_name: cell_annotation[:name],
                                       annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                       cluster_name: cluster.name, consensus: 'mean', genes: genes.join(','),
                                       data_type: 'violin')

      # construct various cache keys for direct lookup (cannot lookup via regex)
      study_clusters_key = "_single_cell_api_v1_studies_#{@study.accession}_clusters_"
      study_cluster_key = "#{study_clusters_key}#{cluster_underscore}_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}"
      expression_mean_key = "_single_cell_api_v1_studies_#{@study.accession}_expression_violin_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}_consensus_mean_data_type_violin_genes_#{genes_hash}"
      assert Rails.cache.exist?(study_clusters_key), "Did not find matching API clusters cache entry at #{study_clusters_key}"
      assert Rails.cache.exist?(study_cluster_key), "Did not find matching API single cluster cache entry at #{study_cluster_key}"
      assert Rails.cache.exist?(expression_mean_key), "Did not find matching API expression mean cache entry at #{expression_mean_key}"

      # load removal keys via associated study files
      api_removal_key = "_single_cell_api_v1_studies_#{@study.accession}"

      # clear caches individually and assert removals
      CacheRemovalJob.new(api_removal_key).perform
      refute Rails.cache.exist?(study_clusters_key), "Did not delete matching API clusters cache entry at #{study_clusters_key}"
      refute Rails.cache.exist?(study_cluster_key), "Did not delete matching API single cluster cache entry at #{study_cluster_key}"
      CacheRemovalJob.new(@study.url_safe_name).perform
      puts "#{annotation} tests pass!"
    end
  end

  test 'should remove extraneous percent characters from cache paths' do
    cluster = @study.cluster_groups.first
    cluster_underscore = cluster.name.split.join('_')
    study_clusters_key = "_single_cell_api_v1_studies_#{@study.accession}_clusters_"
    cell_annotation = cluster.cell_annotations.sample
    sanitized_cache_path = "#{study_clusters_key}#{cluster_underscore}_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}_foo_bar"
    genes = @study.genes.map(&:name)
    genes_hash = Digest::SHA256.hexdigest genes.sort.join
    sanitized_expression_path = "_single_cell_api_v1_studies_#{@study.accession}_expression_violin_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}_consensus_mean_data_type_violin_genes_#{genes_hash}"

    # make request with extra parameter with % sign
    get api_v1_study_cluster_path(study_id: @study.accession, annotation_name: cell_annotation[:name],
                                  annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                  cluster_name: cluster.name, foo: "%bar%"), as: :json
    assert_response :success
    assert Rails.cache.exist?(sanitized_cache_path)

    # put % sign in gene list
    get api_v1_study_expression_path(study_id: @study.accession, annotation_name: cell_annotation[:name],
                                     annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                     cluster_name: cluster.name, consensus: 'mean', genes: genes.join(',%'),
                                     data_type: 'violin')

    assert_response :success
    assert Rails.cache.exist?(sanitized_expression_path)
  end
end
