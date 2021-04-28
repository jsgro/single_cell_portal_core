require "test_helper"

class PrecomputedScoreTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor
  include SelfCleaningSuite

  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @basic_study = FactoryBot.create(:detached_study,
                                     name_prefix: 'Gene List Study',
                                     public: false,
                                     user: @user,
                                     test_array: @@studies_to_clean)
    @cluster_list = %w(Cluster1 Cluster2 Cluster3)
    @gene_scores = [
      {
        'PTEN' => Hash[@cluster_list.zip([1,2,3])]
      },
      {
        'AGPAT2' => Hash[@cluster_list.zip([4,5,6])]
      }
    ]
    @gene_list_file = FactoryBot.create(:gene_list,
                                        study: @basic_study,
                                        name: 'marker_gene_list.txt',
                                        list_name: 'Marker List 1',
                                        clusters_input: @cluster_list,
                                        gene_scores_input: @gene_scores)
  end

  test 'should return GCT of expression scores' do
    precomputed_score = @basic_study.precomputed_scores.by_name('Marker List 1')
    assert precomputed_score.present?
    gct = precomputed_score.to_gct
    gct_list = gct.split("\n").map(&:strip)
    expression_entries = gct_list[3..]
    expression_entries.each do |line|
      values = line.split("\t")
      gene_name = values.first
      expression_scores = values[2..].map(&:to_i) # must convert to Integer since this was rendered as text
      matching_entry = @gene_scores.detect {|score| score.keys.first == gene_name }
      assert matching_entry.present?
      expected_clusters = matching_entry.values.first.keys
      expected_expression = matching_entry.values.first.values
      assert_equal expected_clusters, precomputed_score.clusters
      assert_equal expected_expression, expression_scores
    end
  end
end
