require 'test_helper'

class RenderExpressionArraysParametersTest < ActiveSupport::TestCase
  before(:all) do
    @dense_options = {
      cluster_file: 'gs://test_bucket/cluster.tsv',
      cluster_name: 'UMAP',
      matrix_file_path: 'gs://test_bucket/dense.tsv',
      matrix_file_type: 'dense'
    }

    @sparse_options = {
      cluster_file: 'gs://test_bucket/cluster.tsv',
      cluster_name: 'UMAP',
      matrix_file_path: 'gs://test_bucket/sparse.tsv',
      matrix_file_type: 'mtx',
      gene_file: 'gs://test_bucket/genes.tsv',
      barcode_file: 'gs://test_bucket/barcodes.tsv'
    }
  end

  test 'should instantiate and validate parameters' do
    dense_params = RenderExpressionArraysParameters.new(@dense_options)
    assert dense_params.valid?
    sparse_params = RenderExpressionArraysParameters.new(@sparse_options)
    assert sparse_params.valid?

    # test conditional validations
    dense_params.matrix_file_type = 'bar'
    assert_not dense_params.valid?
    assert_equal %i[matrix_file_type], dense_params.errors.attribute_names
    sparse_params.gene_file = 'foo'
    assert_not sparse_params.valid?
    assert_equal [:gene_file], sparse_params.errors.attribute_names
  end

  test 'should format render expression array parameters for python cli' do
    dense_params = RenderExpressionArraysParameters.new(@dense_options)
    options_array = dense_params.to_options_array
    dense_params.attributes.each do |name, value|
      next if value.blank? # gene_file and barcode_file will not be set

      expected_name = Parameterizable.to_cli_opt(name)
      assert_includes options_array, expected_name
      assert_includes options_array, value
    end
    assert_includes options_array, RenderExpressionArraysParameters::PARAMETER_NAME

    sparse_params = RenderExpressionArraysParameters.new(@sparse_options)
    options_array = sparse_params.to_options_array
    sparse_params.attributes.each do |name, value|
      expected_name = Parameterizable.to_cli_opt(name)
      assert_includes options_array, expected_name
      assert_includes options_array, value
    end
    assert_includes options_array, RenderExpressionArraysParameters::PARAMETER_NAME
  end

  test 'converts keys into cli options' do
    assert_equal '--matrix-file-path', Parameterizable.to_cli_opt(:matrix_file_path)
    assert_equal '--foo', Parameterizable.to_cli_opt('foo')
  end

  test 'should set default machine type for render expression array jobs' do
    params = RenderExpressionArraysParameters.new
    assert_equal RenderExpressionArraysParameters::MACHINE_TYPE, params.machine_type
  end
end
