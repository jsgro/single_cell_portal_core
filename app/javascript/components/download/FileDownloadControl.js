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

  if (!file.upload_file_name || file.human_data) {
    return null
  } else {
    return <p style={{ display: 'inline' }} >
      {!file.generation ? <span style={{ marginLeft: '5px' }} className="label label-warning no-download-available" data-toggle="tooltip"
        title='You can download this file once it has been fully uploaded. Check back soon.'>
        {<span className="fas fa-ban"></span> } Awaiting remote file
      </span> :
        <a onClick={() => handleDownloadClick()} className="btn action" style={{ marginLeft: '5px' }} >
          {<span className="fas fa-download"></span> } {bytesToSize(file.upload_file_size)}
        </a>
      }
    </p>
  }
}
