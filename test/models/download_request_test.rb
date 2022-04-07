require 'test_helper'

class DownloadRequestTest < ActiveSupport::TestCase

  before(:all) do
    @azul_hash = {
        'Fake.HCA.Study.1' => [
          {
            'source' => 'hca',
            'count' => 1,
            'upload_file_size' => 10.megabytes,
            'file_format' => 'loom',
            'file_type' => 'analysis_file',
            'accession' => 'FakeHCAStudy1',
            'project_id' => 'hca_project_id'
          }
        ],
        'Fake.HcaS.tu.d.y.2' => []
      }
      
    @encoded_azul_hash = "{\"Fake.HCA.Study.1\":[{\"source\":\"hca\",\"count\":1,\"upload_file_size\":10485760,\"file_format\":\"loom\",\"file_type\":\"analysis_file\",\"accession\":\"FakeHCAStudy1\",\"project_id\":\"hca_project_id\"}],\"Fake.HcaS.tu.d.y.2\":[]}"

  end

  test 'should transform azul_file hashes to JSON and back' do
    assert_equal @encoded_azul_hash, DownloadRequest.transform_files(@azul_hash)
    assert_equal @azul_hash, DownloadRequest.transform_files(@encoded_azul_hash, :decode)
    assert_raises ArgumentError do
        DownloadRequest.transform_files(@azul_hash, :foo)
    end
  end
end

