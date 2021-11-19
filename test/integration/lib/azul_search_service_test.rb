# tests for AzulSearchService methods
require 'test_helper'

class AzulSearchServiceTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @azul_client = ApplicationController.hca_azul_client
    @facets = [
      {
        id: 'species',
        filters: [{ id: 'NCBITaxon9609', name: 'Homo sapiens' }]
      },
      {
        id: 'organ',
        filters: [{ id: 'UBERON_0000178', name: 'blood' }]
      }
    ]
    @terms = %w[pulmonary]
    # expected result from Azul
    @hca_project_shortname = 'HumanTissueTcellActivation'
    @hca_project_id = '4a95101c-9ffc-4f30-a809-f04518a23803'
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Azul Search Test',
                               user: @user,
                               test_array: @@studies_to_clean)
    SearchFacet.update_all_facet_filters
  end

  after(:all) do
    SearchFacet.all.map(&:update_filter_values!)
  end

  test 'should search Azul using facets' do
    results = AzulSearchService.get_results(selected_facets: @facets, terms: nil)
    assert_includes results.keys, @hca_project_shortname
    project = results[@hca_project_shortname]
    # will always be project manifest file
    manifest = project[:file_information].detect { |f| f[:file_type] == 'Project Manifest' }
    assert manifest.present?
  end

  test 'should search Azul using terms' do
    results = AzulSearchService.get_results(selected_facets: [], terms: @terms)
    project_short_name = 'PulmonaryFibrosisGSE135893'
    assert_includes results.keys, project_short_name
    expected_term_match = { total: 5, terms: { pulmonary: 5 } }.with_indifferent_access
    assert_equal expected_term_match, results.dig(project_short_name, :term_matches)
  end

  test 'should search Azul using terms and keywords' do
    facets = [{ id: 'organ', filters: [{ id: 'lung', name: 'lung' }] }]
    results = AzulSearchService.get_results(selected_facets: facets, terms: @terms)
    project_short_name = 'PulmonaryFibrosisGSE135893'
    assert_includes results.keys, project_short_name
    expected_term_match = { total: 5, terms: { pulmonary: 5 } }.with_indifferent_access
    expected_facet_match = {
      organ: [{ id: 'lung', name: 'lung' }],
      disease: [
        { id: 'idiopathic pulmonary fibrosis', name: 'idiopathic pulmonary fibrosis' },
        { id: 'pulmonary fibrosis', name: 'pulmonary fibrosis' }
      ],
      facet_search_weight: 3
    }.with_indifferent_access
    assert_equal expected_term_match, results.dig(project_short_name, :term_matches)
    assert_equal expected_facet_match, results.dig(project_short_name, :facet_matches)
  end

  test 'should match results on facets' do
    query = { projectId: { is: [@hca_project_id] } }.to_json
    raw_results = @azul_client.projects(query: query, size: 1)
    tcell_project = raw_results['hits'].first
    matches = AzulSearchService.get_facet_matches(tcell_project, @facets)
    %w[species organ].each do |facet_name|
      assert_includes matches.keys, facet_name
    end
    assert_equal 2, matches[:facet_search_weight]
  end

  test 'should append results to studies/facet map' do
    facet_map = {
      @study.accession => {
        species: [{ id: 'NCBITaxon9609', name: 'Homo sapiens' }],
        facet_search_weight: 1
      }
    }.with_indifferent_access
    initial_results = [@study]
    terms = ['CD8+ T cells']
    studies, facet_map = AzulSearchService.append_results_to_studies(initial_results,
                                                                     selected_facets: @facets,
                                                                     terms: terms, facet_map: facet_map)
    assert studies.size > 1
    hca_entry = studies.detect { |study| study.is_a?(Hash) ? study[:accession] == @hca_project_shortname : nil }
    assert hca_entry.present?
    hca_facet_entry = facet_map[@hca_project_shortname]
    assert hca_facet_entry.present?
    assert_equal 2, hca_facet_entry[:facet_search_weight]
    assert_equal 1, hca_entry.dig(:term_matches, :total)
    assert_equal terms, hca_entry.dig(:term_matches, :terms).keys
  end

  test 'should retrieve all facets/filters' do
    facets = AzulSearchService.get_all_facet_filters
    expected_keys = %w[organ disease organism_age preservation_method species study_name organ_region
                       library_preparation_protocol sex study_description cell_type].sort
    assert_equal expected_keys, facets.keys.sort
    diseases = facets.dig('disease', 'filters')
    assert_includes diseases, 'normal'
    assert_includes diseases, 'multiple sclerosis'
    assert_not facets.dig('disease', 'is_numeric')
    assert facets.dig('organism_age', 'is_numeric')
  end

  test 'should merge facet lists' do
    gallus_filter = { id: 'NCBITaxon_9031', name: 'Gallus gallus' }
    extra_facets = [
      {
        id: 'species',
        filters: [gallus_filter]
      }
    ]
    expected_facets = [
      {
        id: 'species',
        filters: [{ id: 'NCBITaxon9609', name: 'Homo sapiens' }, gallus_filter]
      },
      {
        id: 'organ',
        filters: [{ id: 'UBERON_0000178', name: 'blood' }]
      }
    ]
    assert_equal expected_facets, AzulSearchService.merge_facet_lists(@facets, extra_facets)
    assert_equal expected_facets, AzulSearchService.merge_facet_lists(@facets, nil, extra_facets)
  end

  test 'should compute term match weights' do
    result = {
      name: 'Fake lung study',
      description: 'This is a fake study about human lung cancers.'
    }.with_indifferent_access
    expected_term_match = { total: 2, terms: { lung: 2 } }.with_indifferent_access
    assert_equal expected_term_match, AzulSearchService.get_search_term_weights(result, %w[lung])
  end
end
