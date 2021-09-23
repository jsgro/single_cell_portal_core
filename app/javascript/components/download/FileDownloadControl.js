import React, { useState, useEffect } from 'react'
import { fetchBucketFile } from 'lib/scp-api'

export const FileTypeExtensions = {
  plainText: ['.txt', '.tsv', '.text', '.csv', '.txt.gz', '.tsv.gz', '.text.gz', '.csv.gz'],
  image: ['.jpeg', '.jpg', '.png', '.bmp']
}

/** renders a file upload control for the given file object */
export default function FileDownloadControl({ file, bucketName }) {
  console.log('file:', file)
  console.log('filedownload_path:', file.upload_file_name)
  console.log('filedownl:', file?.upload?.url)
  console.log('bucketName:', bucketName)

  const [remoteImageUrl, setRemoteImageUrl] = useState(null)
  const fileName = file.upload_file_name
  console.log('fileName:', fileName)


    /** If there is a remote file, try to load it and render it on the page */
    useEffect(() => {
      setRemoteImageUrl('l')
      getBucketLocalUrl(bucketName, fileName).then(setRemoteImageUrl)
    }, [bucketName, fileName])


  async function getBucketLocalUrl(bucketName, fileName) {
    const response = await fetchBucketFile(bucketName, fileName)
    const imageBlob = await response.blob()
    console.log('resp:', response)
    console.log('respurl:', imageBlob)

    return URL.createObjectURL(imageBlob)
  }

  console.log('remoteImageUrl:', remoteImageUrl)


// console.log('s:', study_file)
  return file.upload_file_name ? 
  <div className="form-group">
    <br/>
    <button className="fas fa-download">
    <a href = {remoteImageUrl} rel="noreferrer" target="_blank"> {file.upload_file_name}</a>

          </button>
    {/* { file.uploadSelection &&
      <span> {file.uploadSelection.name} ({bytesToSize(file.uploadSelection.size)})</span>
    } */}
    {/* <div className="file-container" id={`clusterFileList-${file._id}`}></div> */}
  </div> :
   null 
}

// <% if study_file.upload_file_name.nil? && study_file.human_data %>
//       <%= link_to "<span class='fas fa-cloud-download'></span> External".html_safe, study_file.download_path, class: 'btn btn-primary',
//                   target: :_blank, rel: 'noopener noreferrer', data: {"analytics-name": 'file-download:study-single:external'} %>