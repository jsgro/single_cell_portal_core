import React from 'react'

import { bytesToSize } from 'lib/stats'

const plainTextExtensions = ['.txt', '.tsv', '.text', '.csv']
const mtxExtensions = ['.mtx', '.mm', '.txt', '.text']
const imageExtensions = ['.jpeg', '.jpg', '.png', '.bmp']

export const FileTypeExtensions = {
  plainText: plainTextExtensions.concat(plainTextExtensions.map(ext => `${ext}.gz`)),
  mtx: mtxExtensions.concat(mtxExtensions.map(ext => `${ext}.gz`)),
  image: imageExtensions
}

/** renders a file upload control for the given file object */
export default function FileUploadControl({
  file, updateFile,
  handleSaveResponse,
  allowedFileTypes=['*'],
  validationMessages={}
}) {
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
      <input className="file-upload-input"
        type="file"
        id={inputId}
        onChange={handleFileSelection}
        accept={allowedFileTypes.join(',')}/>
    </button>
    { file.uploadSelection &&
      <span> {file.uploadSelection.name} ({bytesToSize(file.uploadSelection.size)})</span>
    }
    { validationMessages['fileName'] && <div className="validation-error">
      { validationMessages['fileName'] }
    </div>}
  </div>
}
