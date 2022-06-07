require 'test_helper'

class DifferentialExpressionParametersTest < ActiveSupport::TestCase

  before(:all) do
    @dense_options = {
      annotation_name: 'Category',
      annotation_type: 'group',
      annotation_scope: 'cluster',
      annotation_file: 'gs://test_bucket/metadata.tsv',
      cluster_file: 'gs://test_bucket/cluster.tsv',
      cluster_name: 'UMAP',
      matrix_file_path: 'gs://test_bucket/dense.tsv',
      matrix_file_type: 'dense'
    }

    @sparse_options = {
      annotation_name: 'Category',
      annotation_type: 'group',
      annotation_scope: 'cluster',
      annotation_file: 'gs://test_bucket/metadata.tsv',
      cluster_file: 'gs://test_bucket/cluster.tsv',
      cluster_name: 'UMAP',
      matrix_file_path: 'gs://test_bucket/sparse.tsv',
      matrix_file_type: 'mtx',
      gene_file: 'gs://test_bucket/genes.tsv',
      barcode_file: 'gs://test_bucket/barcodes.tsv'
    }
  end

  test 'should instantiate and validate parameters' do
    dense_params = DifferentialExpressionParameters.new(@dense_options)
    assert dense_params.valid?
    sparse_params = DifferentialExpressionParameters.new(@sparse_options)
    assert sparse_params.valid?

    # test conditional validations
    dense_params.annotation_file = ''
    dense_params.annotation_type = 'numeric'
    dense_params.annotation_scope = 'foo'
    dense_params.matrix_file_type = 'bar'
    assert_not dense_params.valid?
    assert_equal %i[annotation_file annotation_scope annotation_type matrix_file_type],
                 dense_params.errors.attribute_names.sort
    sparse_params.gene_file = 'foo'
    assert_not sparse_params.valid?
    assert_equal [:gene_file], sparse_params.errors.attribute_names
  end

  test 'should format differential expression parameters for python cli' do
    dense_params = DifferentialExpressionParameters.new(@dense_options)
    options_array = dense_params.to_options_array
    dense_params.attributes.each do |name, value|
      next if value.blank? # gene_file and barcode_file will not be set

      expected_name = DifferentialExpressionParameters.to_cli_opt(name)
      assert_includes options_array, expected_name
      assert_includes options_array, value
    end
    assert_includes options_array, '--differential-expression'

    sparse_params = DifferentialExpressionParameters.new(@sparse_options)
    options_array = sparse_params.to_options_array
    sparse_params.attributes.each do |name, value|
      expected_name = DifferentialExpressionParameters.to_cli_opt(name)
      assert_includes options_array, expected_name
      assert_includes options_array, value
    end
    assert_includes options_array, '--differential-expression'
  end

  test 'converts keys into cli options' do
    assert_equal '--annotation-name', DifferentialExpressionParameters.to_cli_opt(:annotation_name)
    assert_equal '--foo', DifferentialExpressionParameters.to_cli_opt('foo')
  end
end
