require 'test_helper'

class FacetNameConverterTest < ActiveSupport::TestCase

  include Minitest::Hooks
  include TestInstrumentor

  before(:all) do
    @scp_field_names = %i[study_name study_description disease species]
    @expected_conversions = {
      hca: %w[project_title project_description disease genus_species],
      tim: %w[dct:title dct:description TerraCore:hasDisease TerraCore:hasOrganismType]
    }
    @nonexistent_field = :foobar
  end

  # iterate through all fields and test conversion
  def compare_all_fields(model_name)
    @scp_field_names.each_with_index do |scp_name, index|
      converted_name = FacetNameConverter.convert_to_model(:alexandria, model_name, scp_name)
      assert_equal @expected_conversions[model_name][index], converted_name
    end
    # test fallback
    assert_equal @nonexistent_field, FacetNameConverter.convert_to_model(:alexandria, model_name, @nonexistent_field)
  end

  test 'should convert to HCA names' do
    compare_all_fields(:hca)
  end

  test 'should convert to TIM names' do
    compare_all_fields(:tim)
  end
end
