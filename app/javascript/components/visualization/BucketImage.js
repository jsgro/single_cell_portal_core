import React, { useState, useEffect } from 'react'

import { fetchBucketFile } from 'lib/scp-api'

/** display an image file directly from a GCP bucket */
export default function BucketImage({ bucketName, fileName }) {
  const [remoteImageUrl, setRemoteImageUrl] = useState(null)

  /** If there is a remote file, try to load it and render it on the page */
  useEffect(() => {
    setRemoteImageUrl(null)
    fetchBucketFile('fc-458fcddb-bbef-4eb3-b0c6-3d2253df623e', 'chicken.jpeg')
      .then(response => response.blob())
      .then(imageBlob => {
        const imageObjectURL = URL.createObjectURL(imageBlob)
        setRemoteImageUrl(imageObjectURL)
      })
  }, [bucketName, fileName])

  if (!remoteImageUrl) {
    return <></>
  }
  return <img src={remoteImageUrl} alt={fileName}/>
}
