import React, { useState, useEffect } from 'react'
import { fetchBucketFile } from 'lib/scp-api'
import { UserContext } from 'providers/UserProvider'

export const FileTypeExtensions = {
  plainText: ['.txt', '.tsv', '.text', '.csv', '.txt.gz', '.tsv.gz', '.text.gz', '.csv.gz'],
  image: ['.jpeg', '.jpg', '.png', '.bmp']
}

/** renders a file upload control for the given file object */
export default function FileDownloadControl({ file, bucketName }) {
  const [remoteImageUrl, setRemoteImageUrl] = useState(null)
  const fileName = file.upload_file_name

  /** If there is a remote file, try to load it and render it on the page */
  useEffect(() => {
    setRemoteImageUrl(null)
    getBucketLocalUrl(bucketName, fileName).then(setRemoteImageUrl)
  }, [bucketName, fileName])

  async function getBucketLocalUrl(bucketName, fileName) {
    const response = await fetchBucketFile(bucketName, fileName)
    const filefrombucket = await response
    return URL.createObjectURL(filefrombucket)
  }

  console.log('file:', file)
  console.log('UserContext:', UserContext)

  if (!file.upload_file_name) {
      return null 
  } 
  else {
    if (!file.upload_file_name && file.human_data) { 
      return  <button className="fas fa-cloud-download btn btn-primary"> type="button"
              <a href rel="noreferrer" target="_blank"> {'External'}</a> 
              </button>
    }
    else if (!file.generation) { 
      return <span className="label label-warning no-download-available" >
        You will be able to download this file once it has been uploaded to our remote data store.  Check back soon.
        </span>
    } else {
      console.log('remoteImageUrl:', remoteImageUrl)
      return <a href={remoteImageUrl} rel="noreferrer" target="_blank"> <button>File</button> </a>
    }
  }
}
