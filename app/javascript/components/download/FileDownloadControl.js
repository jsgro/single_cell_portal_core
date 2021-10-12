import React from 'react'
import { fetchBucketFile } from 'lib/scp-api'
import { bytesToSize } from 'lib/stats'

/** renders a file download control for the given file object */
export default function FileDownloadControl({ file, bucketName }) {
  const fileName = file.upload_file_name

  /** Load file when button is clicked */
  const handleDownloadClick = () => {
    getBucketLocalUrl(bucketName, fileName).then(value => window.open(value, '_blank', 'noopener,noreferrer'))
  }

  /** get the remote file path */
  async function getBucketLocalUrl() {
    const response = await fetchBucketFile(bucketName, fileName)
    const fileBlob = await response.blob()
    return URL.createObjectURL(fileBlob)
  }

  // don't show the control if there's no remote file, or if the user has already selected a replacement
  if (!file.upload_file_name || file.uploadSelection) {
    return null
  } else {
    if (!file.upload_file_name && file.human_data) {
      return null
    // TODO (SCP-3719): Once the Sequence Data tab is added update this section for handling external human data files
    } else {
      return <div className="form-group">
        {!file.generation ? <span className="label label-warning no-download-available" data-toggle="tooltip"
          title='You can download this file once it has been fully uploaded. Check back soon.'>
          {<span className="fas fa-ban"></span> } Awaiting remote file
        </span> :
          <a onClick={() => handleDownloadClick()} className="btn action">
            {<span className="fas fa-download"></span> } {bytesToSize(file.upload_file_size)}
          </a>
        }
      </div>
    }
  }
}
