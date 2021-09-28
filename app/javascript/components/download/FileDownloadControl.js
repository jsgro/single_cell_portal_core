import React, { useState, useEffect } from 'react'
import { fetchBucketFile } from 'lib/scp-api'
import { bytesToSize } from 'lib/stats'

/** renders a file download control for the given file object */
export default function FileDownloadControl({ file, bucketName }) {
  const [remoteImageUrl, setRemoteImageUrl] = useState(null)
  const fileName = file.upload_file_name

  /** If there is a remote file, try to load it */
  useEffect(() => {
    setRemoteImageUrl(null)
    getBucketLocalUrl(bucketName, fileName).then(setRemoteImageUrl)
  }, [bucketName, fileName])

  /** get the remote file path */
  async function getBucketLocalUrl(bucketName, fileName) {
    const response = await fetchBucketFile(bucketName, fileName)
    const filefrombucket = await response
    const respBlob = await filefrombucket.blob()
    return URL.createObjectURL(respBlob)
  }

  if (!file.upload_file_name) {
    return null
  } else {
    if (!file.upload_file_name && file.human_data) {
      return null
      // TODO once the Sequence Data tab is added update this section for handling external human data files
    } else {
      return <p> <label> Link to file </label>
        <br></br>
        {!file.generation ? <span className="label label-warning no-download-available" data-toggle="tooltip"
          title='You will be able to download this file once it has been uploaded to our remote data store. Check back soon.'>
          {<span className="fas fa-ban"></span> } Awaiting remote file
        </span> :
          <a href={remoteImageUrl} rel="noreferrer"
            className= "btn btn-primary dl-link" target="_blank">
            {<span className="fas fa-download"></span> } {bytesToSize(file.upload_file_size)}
          </a>}
      </p>
    }
  }
}
