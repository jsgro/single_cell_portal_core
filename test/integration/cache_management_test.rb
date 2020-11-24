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
    expression_file = study.expression_matrix_file('expression_matrix_example.txt')
    genes = study.genes.map(&:name)
    gene = genes.sample
    genes_hash = Digest::SHA256.hexdigest genes.sort.join
    cluster.cell_annotations.each do |cell_annotation|
      annotation = "#{cell_annotation[:name]}--#{cell_annotation[:type]}--cluster"
      puts "Testing with annotation: #{annotation}"

      # get various actions subject to caching
      get render_gene_expression_plots_path(accession: study.accession, study_name: study.url_safe_name, cluster: cluster.name, annotation: annotation, gene: gene, plot_type: 'violin'), xhr: true
      get render_gene_set_expression_plots_path(accession: study.accession, study_name: study.url_safe_name, cluster: cluster.name, annotation: annotation, search: {genes: genes.join(' ')}, plot_type: 'violin', 'boxpoints':'all'), xhr: true
      get render_gene_expression_plots_path(accession: study.accession, study_name: study.url_safe_name, cluster: cluster.name, annotation: annotation, gene: gene, plot_type: 'box'), xhr: true
      get render_gene_set_expression_plots_path(accession: study.accession, study_name: study.url_safe_name, cluster: cluster.name, annotation: annotation, search: {genes: genes.join(' ')}, plot_type: 'box','boxpoints':'all'), xhr: true
      get expression_query_path(accession: study.accession, study_name: study.url_safe_name, cluster: cluster.name, annotation: annotation, search: {genes: genes.join(' ')} ), xhr: true
      get annotation_query_path(accession: study.accession, study_name: study.url_safe_name, annotation: annotation, cluster: cluster.name), xhr: true
      get api_v1_study_explore_path(study_id: study.accession), as: :json
      get api_v1_study_clusters_path(study_id: study.accession), as: :json
      get api_v1_study_cluster_path(study_id: study.accession, annotation_name: cell_annotation[:name],
                                    annotation_type: cell_annotation[:type], annotation_scope: 'cluster',
                                    cluster_name: cluster.name), as: :json

      # construct various cache keys for direct lookup (cannot lookup via regex)
      v_expression_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/render_gene_expression_plots/#{gene}_#{cluster_name}_#{annotation}_violin.js"
      v_set_expression_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/render_gene_set_expression_plots_#{cluster_name}_#{annotation}_#{genes_hash}_violin_all.js"
      b_expression_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/render_gene_expression_plots/#{gene}_#{cluster_name}_#{annotation}_box.js"
      b_set_expression_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/render_gene_set_expression_plots_#{cluster_name}_#{annotation}_#{genes_hash}_box_all.js"
      exp_query_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/expression_query_#{cluster_name}_#{annotation}__#{genes_hash}.js"
      annot_query_cache_key = "views/localhost/single_cell/study/#{study.accession}/#{study.url_safe_name}/annotation_query_#{cluster_name}_#{annotation}.js"
      study_explore_key = "_single_cell_api_v1_studies_#{study.accession}_explore_"
      study_clusters_key = "_single_cell_api_v1_studies_#{study.accession}_clusters_"
      study_cluster_key = "#{study_clusters_key}#{cluster_underscore}_annotation_name_#{cell_annotation[:name]}_annotation_scope_cluster_annotation_type_#{cell_annotation[:type]}_cluster_name_#{cluster_underscore}"

      assert Rails.cache.exist?(v_expression_cache_key), "Did not find matching gene expression cache entry at #{v_expression_cache_key}"
      assert Rails.cache.exist?(v_set_expression_cache_key), "Did not find matching gene set expression cache entry at #{v_set_expression_cache_key}"
      assert Rails.cache.exist?(b_expression_cache_key), "Did not find matching gene expression cache entry at #{b_expression_cache_key}"
      assert Rails.cache.exist?(b_set_expression_cache_key), "Did not find matching gene set expression cache entry at #{b_set_expression_cache_key}"
      assert Rails.cache.exist?(exp_query_cache_key), "Did not find matching expression query cache entry at #{exp_query_cache_key}"
      assert Rails.cache.exist?(annot_query_cache_key), "Did not find matching annotation query cache entry at #{annot_query_cache_key}"
      assert Rails.cache.exist?(study_explore_key), "Did not find matching API explore cache entry at #{study_explore_key}"
      assert Rails.cache.exist?(study_clusters_key), "Did not find matching API clusters cache entry at #{study_clusters_key}"
      assert Rails.cache.exist?(study_cluster_key), "Did not find matching API single cluster cache entry at #{study_cluster_key}"

      # load removal keys via associated study files
      expression_file_cache_key = expression_file.cache_removal_key
      api_removal_key = "_single_cell_api_v1_studies_#{study.accession}"

      # clear caches individually and assert removals
      CacheRemovalJob.new(expression_file_cache_key).perform
      refute Rails.cache.exist?(v_expression_cache_key), "Did not delete matching gene expression cache entry at #{v_expression_cache_key}"
      refute Rails.cache.exist?(v_set_expression_cache_key), "Did not delete matching gene set expression cache entry at #{v_set_expression_cache_key}"
      refute Rails.cache.exist?(b_expression_cache_key), "Did not delete matching gene expression cache entry at #{b_expression_cache_key}"
      refute Rails.cache.exist?(b_set_expression_cache_key), "Did not delete matching gene set expression cache entry at #{b_set_expression_cache_key}"
      refute Rails.cache.exist?(exp_query_cache_key), "Did not delete matching expression query cache entry at #{exp_query_cache_key}"
      CacheRemovalJob.new(api_removal_key).perform
      refute Rails.cache.exist?(study_explore_key), "Did not delete matching API explore cache entry at #{study_explore_key}"
      refute Rails.cache.exist?(study_clusters_key), "Did not delete matching API clusters cache entry at #{study_clusters_key}"
      refute Rails.cache.exist?(study_cluster_key), "Did not delete matching API single cluster cache entry at #{study_cluster_key}"
      CacheRemovalJob.new(study.url_safe_name).perform
      refute Rails.cache.exist?(annot_query_cache_key), "Did not delete matching annotation query cache entry at #{annot_query_cache_key}"
      puts "#{annotation} tests pass!"
    end

    puts "#{File.basename(__FILE__)}: #{self.method_name} successful!"
  end

end
