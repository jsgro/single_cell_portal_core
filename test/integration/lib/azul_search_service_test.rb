# tests for AzulSearchService methods

require 'test_helper'

class AzulSearchServiceTest < ActiveSupport::TestCase
  include Minitest::Hooks
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
  end

  test 'should search Azul using facets' do
    results = AzulSearchService.get_results(selected_facets: @facets)
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
end
