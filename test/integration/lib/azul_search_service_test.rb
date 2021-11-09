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
    # expected result from Azul
    @hca_project_shortname = 'HumanTissueTcellActivation'
    @hca_project_id = '4a95101c-9ffc-4f30-a809-f04518a23803'
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
                               name_prefix: 'Azul Search Test',
                               user: @user,
                               test_array: @@studies_to_clean)
  end

  test 'should search Azul using facets' do
    results = AzulSearchService.get_results(selected_facets: @facets, terms: nil)
    assert_includes results.keys, @hca_project_shortname
    project = results[@hca_project_shortname]
    # will always be project manifest file
    manifest = project[:file_information].detect { |f| f[:file_type] == 'Project Manifest' }
    assert manifest.present?
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
    studies, facet_map = AzulSearchService.append_results_to_studies(initial_results,
                                                                     selected_facets: @facets,
                                                                     terms: [], facet_map: facet_map)
    assert studies.size > 1
    hca_entry = studies.detect { |study| study.is_a?(Hash) ? study[:accession] == @hca_project_shortname : nil }
    assert hca_entry.present?
    hca_facet_entry = facet_map[@hca_project_shortname]
    assert hca_facet_entry.present?
    assert_equal 2, hca_facet_entry[:facet_search_weight]
  end

  test 'should retrieve all facets/filters' do
    facets = AzulSearchService.get_all_facet_filters
    expected_keys = %w[organ disease organism_age preservation_method species study_name organ_region
                       library_preparation_protocol sex study_description cell_type].sort
    assert_equal expected_keys, facets.keys.sort
    diseases = facets.dig('disease', 'filters')
    assert_includes diseases, "normal"
    assert_includes diseases, "multiple sclerosis"
    assert_not facets.dig('disease', 'is_numeric')
    assert facets.dig('organism_age', 'is_numeric')
  end
end
