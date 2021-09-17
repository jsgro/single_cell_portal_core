import React, { useState, useEffect } from 'react'

import { fetchBucketFile } from 'lib/scp-api'

/** display an image file directly from a GCP bucket */
export default function BucketImage({ bucketName, fileName }) {
  const [remoteImageUrl, setRemoteImageUrl] = useState(null)

  /** If there is a remote file, try to load it and render it on the page */
  useEffect(() => {
    console.log('useEffect!!!')
    setRemoteImageUrl(null)
    getBucketImageLocalUrl(bucketName, fileName).then(setRemoteImageUrl)
  }, [bucketName, fileName])

  if (!remoteImageUrl) {
    return <></>
  }
  console.log(`remote url: ${remoteImageUrl}`)
  return <img src={remoteImageUrl} alt={fileName}/>
}

/** downloads the given remote image and constructs a local url, suitable for use in an img tag */
export async function getBucketImageLocalUrl(bucketName, fileName) {
  const response = await fetchBucketFile(bucketName, fileName)
  const imageBlob = await response.blob()
  return URL.createObjectURL(imageBlob)
}
