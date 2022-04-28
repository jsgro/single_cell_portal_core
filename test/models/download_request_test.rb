require 'test_helper'

class DownloadRequestTest < ActiveSupport::TestCase

  test 'should transform azul_file hashes to JSON and back' do

    azul_hash = {
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

    download_req = DownloadRequest.create!(
      azul_files: azul_hash
    )

    download_req.save!

    assert_equal azul_hash , download_req.azul_files_as_hash
    assert_equal ActiveSupport::JSON.encode(azul_hash), download_req.azul_files.gsub(' ', '')

    download_req.update!(azul_files: nil)
    assert_nil download_req.azul_files
    assert_equal({}, download_req.azul_files_as_hash)

  end
end

