require 'test_helper'

class ClusterFileInfoTest < ActiveSupport::TestCase
  before(:all) do
    @user = FactoryBot.create(:api_user, test_array: @@users_to_clean)
    @study = FactoryBot.create(:detached_study,
      name_prefix: 'Basic Cluster Study',
      user: @user,
      test_array: @@studies_to_clean)
  end

  test 'should encode/decode custom color hashes' do
    cluster_file = FactoryBot.create(:cluster_file,
                                     name: 'clusterA.txt',
                                     study: @study)
    color_hash = {
      'name.with.periods' => {
        'key.1' => '#123456',
        'key.2' => '#123456',
        'key.3' => '#123456',
        'key.4' => '#123456'
      },
      'different.name' => {
        'key.a' => '#654321',
        'key.b' => '#654321',
        'key.c' => '#654321'
      }
    }

    cluster_file.update!(cluster_file_info: ClusterFileInfo.new(custom_colors: color_hash))
    cluster_info = cluster_file.cluster_file_info
    assert_equal 'String', cluster_info.custom_colors.class.name
    assert_equal color_hash, cluster_info.custom_colors_as_hash

    cluster_file.update!(cluster_file_info: ClusterFileInfo.new(custom_colors: nil))
    cluster_info = cluster_file.cluster_file_info
    assert_nil cluster_info.custom_colors
    assert_equal({}, cluster_info.custom_colors_as_hash)

  end

  test 'should encode/decode annotation split defaults' do
    cluster_file = FactoryBot.create(:cluster_file,
                                     name: 'clusterB.txt',
                                     study: @study)
    annotation_splits = {
      'foo' => true,
      'bar' => false
    }

    cluster_file.update!(cluster_file_info: ClusterFileInfo.new(annotation_split_defaults: annotation_splits))
    cluster_info = cluster_file.cluster_file_info
    assert_equal 'String', cluster_info.annotation_split_defaults.class.name
    assert_equal annotation_splits, cluster_info.annotation_split_defaults_as_hash

    cluster_file.update!(cluster_file_info: ClusterFileInfo.new(annotation_split_defaults: nil))
    cluster_info = cluster_file.cluster_file_info
    assert_nil cluster_info.annotation_split_defaults
    assert_equal({}, cluster_info.annotation_split_defaults_as_hash)

  end
end

