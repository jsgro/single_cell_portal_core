require "test_helper"

class CacheManagementTest < ActionDispatch::IntegrationTest

  def setup
    host! 'localhost'
    @random_seed = File.open(Rails.root.join('.random_seed')).read.strip
  end

  def test_manage_cache_entries
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    study = Study.find_by(name: "Testing Study #{@random_seed}")
    cluster = study.cluster_groups.first
    cluster_name = cluster.name.split.join('-')
    cluster_underscore = cluster.name.split.join('_') # for API cache paths
    genes = study.genes.map(&:name)
    gene = genes.sample
    genes_hash = Digest::SHA256.hexdigest genes.sort.join
    cluster.cell_annotations.each do |cell_annotation|
      annotation = "#{cell_annotation[:name]}--#{cell_annotation[:type]}--cluster"
      puts "Testing with annotation: #{annotation}"

      # get various actions subject to caching
      get api_v1_study_explore_path(study_id: study.accession), as: :json
      get api_v1_study_clusters_path(study_id: study.accession), as: :json
      get api_v1_study_cluster_path(study_id: study.accession, annotation_name: cell_annotation[:name],
                                    annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                    cluster_name: cluster.name), as: :json
      get api_v1_study_expression_path(study_id: study.accession, annotation_name: cell_annotation[:name],
                                       annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                       cluster_name: cluster.name, consensus: 'mean', genes: genes.join(','),
                                       data_type: 'violin')

      # construct various cache keys for direct lookup (cannot lookup via regex)
      study_clusters_key = "_single_cell_api_v1_studies_#{study.accession}_clusters_"
      study_cluster_key = "#{study_clusters_key}#{cluster_underscore}_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}"
      expression_mean_key = "_single_cell_api_v1_studies_#{study.accession}_expression_violin_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}_consensus_mean_genes_#{genes.join(',')}_data_type_violin"
      assert Rails.cache.exist?(study_clusters_key), "Did not find matching API clusters cache entry at #{study_clusters_key}"
      assert Rails.cache.exist?(study_cluster_key), "Did not find matching API single cluster cache entry at #{study_cluster_key}"
      assert Rails.cache.exist?(expression_mean_key), "Did not find matching API expression mean cache entry at #{expression_mean_key}"

      # load removal keys via associated study files
      api_removal_key = "_single_cell_api_v1_studies_#{study.accession}"

      # clear caches individually and assert removals
      CacheRemovalJob.new(api_removal_key).perform
      refute Rails.cache.exist?(study_clusters_key), "Did not delete matching API clusters cache entry at #{study_clusters_key}"
      refute Rails.cache.exist?(study_cluster_key), "Did not delete matching API single cluster cache entry at #{study_cluster_key}"
      CacheRemovalJob.new(study.url_safe_name).perform
      refute Rails.cache.exist?(annot_query_cache_key), "Did not delete matching annotation query cache entry at #{annot_query_cache_key}"
      puts "#{annotation} tests pass!"
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

  test 'should remove extraneous percent characters from cache paths' do
    puts "#{File.basename(__FILE__)}: #{self.method_name}"

    study = Study.find_by(name: "Testing Study #{@random_seed}")
    cluster = study.cluster_groups.first
    cluster_underscore = cluster.name.split.join('_')
    study_clusters_key = "_single_cell_api_v1_studies_#{study.accession}_clusters_"
    cell_annotation = cluster.cell_annotations.sample
    sanitized_cache_path = "#{study_clusters_key}#{cluster_underscore}_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_foo_bar_cluster_name_#{cluster_underscore}"
    genes = study.genes.map(&:name)
    sanitized_expression_path = "_single_cell_api_v1_studies_#{study.accession}_expression_violin_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}_consensus_mean_genes_#{genes.join(',')}_data_type_violin"

    # make request with extra parameter with % sign
    get api_v1_study_cluster_path(study_id: study.accession, annotation_name: cell_annotation[:name],
                                  annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                  cluster_name: cluster.name, foo: "%bar%"), as: :json
    assert_response :success
    assert Rails.cache.exist?(sanitized_cache_path)

    # put % sign in gene list
    get api_v1_study_expression_path(study_id: study.accession, annotation_name: cell_annotation[:name],
                                     annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                     cluster_name: cluster.name, consensus: 'mean', genes: genes.join(',%'),
                                     data_type: 'violin')

    assert_response :success
    assert Rails.cache.exist?(sanitized_expression_path)

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end
end
