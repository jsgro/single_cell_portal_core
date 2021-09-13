import React from 'react'

import { bytesToSize } from 'lib/stats'

/** renders a file upload control for the given file object */
export default function FileUploadControl({ file, updateFile, handleSaveResponse, allowedFileTypes }) {
  const inputId = `fileInput-${file._id}`

  /** handle user interaction with the file input */
  function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    updateFile(file._id, {
      uploadSelection: selectedFile,
      name: file.name ? file.name : selectedFile.name
    })
  }

  return <div className="form-group">
    <label>File{ file.status !== 'new' && <span>: {file.upload_file_name}</span> }</label>
    <br/>
    <button className="fileinput-button btn btn-secondary" id={`fileButton-${file._id}`}>
      { file.upload_file_name ? 'Change file' : 'Choose file' }
      <input className="file-upload-input" type="file" name="study_file[upload]" id={inputId} onChange={handleFileSelection}/>
    </button>
    { file.selectedFile &&
      <span> {file.selectedFile.name} ({bytesToSize(file.selectedFile.size)})</span>
    }
    <div className="file-container" id={`clusterFileList-${file._id}`}></div>
  </div>
}
