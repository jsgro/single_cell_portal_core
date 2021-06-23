require 'test_helper'

class FacetNameConverterTest < ActiveSupport::TestCase

  include Minitest::Hooks
  include SelfCleaningSuite
  include TestInstrumentor

  before(:all) do
    @scp_field_names = %i(study_name study_description disease species)
    @fields = %i(name id)
    @expected_conversions = {
      hca: {
        name: %w(project_title project_description disease genus_species),
        id: %w(project_title project_description disease genus_species)
      },
      tim: {
        name: %w(dct:title dct:description TerraCore:hasDisease TerraCore:hasOrganismType),
        id: %w(tim__dctc__title tim__dctc__description
               tim__a__terraa__corec__a__bioa__samplea__terraa__corec__c__hasa__disease
               tim__a__terraa__corec__a__donora__terraa__corec__hasa__organisma__type
            )
      }
    }
    @nonexistent_field = :foobar
  end

  test 'should convert to HCA names' do
    @fields.each do |field|
      @scp_field_names.each_with_index do |scp_name, index|
        converted_name = FacetNameConverter.convert_to_model(:hca, scp_name, field)
        assert_equal @expected_conversions[:hca][field][index], converted_name
      end
      # test fallback
      assert_equal @nonexistent_field, FacetNameConverter.convert_to_model(:hca, @nonexistent_field, field)
    end
  end

  test 'should convert to TIM names' do
    @fields.each do |field|
      @scp_field_names.each_with_index do |scp_name, index|
        converted_name = FacetNameConverter.convert_to_model(:tim, scp_name, field)
        assert_equal @expected_conversions[:tim][field][index], converted_name
      end
      # test fallback
      assert_equal @nonexistent_field, FacetNameConverter.convert_to_model(:tim, @nonexistent_field, field)
    end
  end
end
