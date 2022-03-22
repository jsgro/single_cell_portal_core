require 'test_helper'

class ClusterFileInfoTest < ActiveSupport::TestCase

  before(:all) do
    @color_hash = {
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
    @encoded_color_hash = {
      "bmFtZS53aXRoLnBlcmlvZHM=\n" => {
        "a2V5LjE=\n" => '#123456',
        "a2V5LjI=\n" => '#123456',
        "a2V5LjM=\n" => '#123456',
        "a2V5LjQ=\n" => '#123456'
      },
      "ZGlmZmVyZW50Lm5hbWU=\n" => {
        "a2V5LmE=\n" => '#654321',
        "a2V5LmI=\n" => '#654321',
        "a2V5LmM=\n" => '#654321'
      }
    }
  end

  test 'should encode/decode custom color hashes' do
    assert_equal @encoded_color_hash, ClusterFileInfo.transform_custom_colors(@color_hash)
    assert_equal @color_hash, ClusterFileInfo.transform_custom_colors(@encoded_color_hash, :decode64)
    assert_raises ArgumentError do
      ClusterFileInfo.transform_custom_colors(@color_hash, :foo)
    end
  end
end

