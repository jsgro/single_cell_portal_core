# tests for AzulSearchService methods

require 'test_helper'

class AzulSearchServiceTest < ActiveSupport::TestCase
  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
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
    @hca_project_shortname = 'HumanSkinBloodHypSensAndNormalKim'
  end

  test 'should search Azul using facets' do
    results = AzulSearchService.get_azul_results(selected_facets: @facets)
    assert_includes results.keys,@hca_project_shortname
    project = results[@hca_project_shortname]
    # will always be project manifest file
    manifest = project[:file_information].detect { |f| f[:file_type] == 'Project Manifest' }
    assert manifest.present?
  end
end
