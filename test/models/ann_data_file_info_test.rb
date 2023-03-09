require 'test_helper'

class AnnDataFileInfoTest < ActiveSupport::TestCase
  test 'should find matching fragments' do
    anndata_info = AnnDataFileInfo.new(
      data_fragments: [
        { data_type: :cluster, name: 'UMAP', obsm_key_name: 'X_umap' },
        { data_type: :cluster, name: 'tSNE', obsm_key_name: 'X_tsne' },
        { data_type: :expression, y_axis_title: 'log(TPM) expression' }
      ]
    )
    anndata_info.data_fragments.each do |fragment|
      assert_equal fragment, anndata_info.find_fragment(**fragment)
      # remove random key and assert we still get a match (result would still be unique)
      matcher = fragment.deep_dup
      matcher.delete(fragment.keys.sample)
      assert_equal fragment, anndata_info.find_fragment(**matcher)
    end
  end

  test 'should get cluster domain ranges from fragment' do
    anndata_info = AnnDataFileInfo.new(
      data_fragments: [
        {
          data_type: :cluster, name: 'UMAP', obsm_key_name: 'X_umap',
          x_axis_min: -10, x_axis_max: 10, y_axis_min: -15, y_axis_max: 15
        }
      ]
    )
    expected_range = { x_axis_min: -10.0, x_axis_max: 10.0, y_axis_min: -15.0, y_axis_max: 15.0 }
    assert_equal expected_range, anndata_info.get_cluster_domain_ranges('UMAP')
  end
end
