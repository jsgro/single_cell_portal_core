require 'test_helper'

class FacetNameConverterTest < ActiveSupport::TestCase

  before(:all) do
    @scp_field_names = %i[study_name study_description disease species]
    @expected_conversions = {
      hca: %w[project_title project_description disease genus_species],
      tim: %w[dct:title dct:description TerraCore:hasDisease TerraCore:hasOrganismType]
    }
    @nonexistent_field = :foobar
    @external_schemas = FacetNameConverter::SCHEMA_NAMES.dup.reject { |name| name == :alexandria }
  end

  # iterate through all fields and test conversion
  def compare_all_fields(model_name)
    @scp_field_names.each_with_index do |scp_name, index|
      converted_name = FacetNameConverter.convert_schema_column(:alexandria, model_name, scp_name)
      assert_equal @expected_conversions[model_name][index], converted_name
    end
    # test fallback
    assert_equal @nonexistent_field, FacetNameConverter.convert_schema_column(:alexandria, model_name, @nonexistent_field)
  end

  test 'should convert to HCA names' do
    compare_all_fields(:hca)
  end

  test 'should convert to TIM names' do
    compare_all_fields(:tim)
  end

  test 'should throw error on invalid conversion' do
    assert_raise ArgumentError do
      FacetNameConverter.convert_schema_column(:alexandria, :foo, 'species')
    end
  end

  test 'should get mappings hash' do
    @external_schemas.each do |schema|
      assert_not_nil FacetNameConverter.get_map(:alexandria, schema)
      assert_not_nil FacetNameConverter.get_map(schema, :alexandria)
    end
  end

  test 'should find column in schema' do
    @scp_field_names.each do |column|
      @external_schemas.each do |schema|
        assert FacetNameConverter.schema_has_column?(:alexandria, schema, column)
      end
    end
  end
end
