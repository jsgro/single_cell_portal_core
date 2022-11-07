require 'test_helper'

class ImagePipelineParametersTest < ActiveSupport::TestCase
  before(:all) do
    @params = {
      accession: 'SCP1234',
      cluster: 'UMAP',
      bucket: 'test_bucket',
      environment: 'test',
      cores: '4'
    }
    @pipeline_params = ImagePipelineParameters.new(@params)
  end

  test 'should instantiate and validate parameters' do
    assert @pipeline_params.valid?
    invalid = ImagePipelineParameters.new
    assert_not invalid.valid?
    assert_equal invalid.attributes.keys.sort, invalid.errors.errors.map { |e| e.attribute.to_s }.sort

    # test overriding defaults
    fake_image = 'gcr.io/repository/image:version'
    new_params = ImagePipelineParameters.new(@params.merge(cores: '12', docker_image: fake_image))
    assert new_params.valid?
    assert_equal fake_image, new_params.docker_image
    assert_equal '12', new_params.cores
  end

  test 'should format render expression array parameters for python cli' do
    options_array = @pipeline_params.to_options_array
    @pipeline_params.attributes.each do |name, value|
      expected_name = Parameterizable.to_cli_opt(name)
      assert_includes options_array, expected_name
      assert_includes options_array, value
    end
  end
end
