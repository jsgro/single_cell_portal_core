require 'api_test_helper'
require 'test_helper'

class MetadataSchemasControllerTest < ActionDispatch::IntegrationTest
  include Api::V1::Concerns::ConventionSchemas

  SCHEMAS_BASE_DIR = Api::V1::MetadataSchemasController::SCHEMAS_BASE_DIR

  setup do
    @schemas = get_available_schemas
  end

  test 'should load all available schemas' do
    execute_http_request(:get, api_v1_metadata_schemas_path)
    assert_response 200, "Did not get any metadata schemas"
    assert_equal @schemas, json, "Did not find correct projects/schemas, exepected #{@schemas} but found #{json}"
  end

  test 'should load requested schema' do
    project = @schemas.keys.sample
    schema_version = @schemas[project].sample
    schema_format ='json'
    schema_filename = "#{project}_schema.#{schema_format}"
    if schema_version == 'latest'
      schema_filepath = Rails.root.join(SCHEMAS_BASE_DIR, project, schema_filename)
    else
      schema_filepath = Rails.root.join(SCHEMAS_BASE_DIR, project, 'snapshot',
                                        schema_version, schema_filename)
    end
    convention_schema = JSON.parse(File.open(schema_filepath).read)
    execute_http_request(:get, api_v1_metadata_schemas_load_convention_schema_path(project_name: project, version: schema_version,
                                                                                   schema_format:  schema_format))
    assert_response 200, "Did not load requested convention metadata schema: #{project}/#{schema_version}/#{schema_filename}"
    assert_equal convention_schema, json,
                 "Convention schema does not match requested schema: #{convention_schema}\n\n#{json}"
  end
end
