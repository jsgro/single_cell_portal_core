import React from 'react'

import { bytesToSize } from 'lib/stats'

const plainTextExtensions = ['.txt', '.tsv', '.text', '.csv']
const mtxExtensions = ['.mtx', '.mm', '.txt', '.text']
const imageExtensions = ['.jpeg', '.jpg', '.png', '.bmp']
const miscExtensions = ['.txt', '.text', '.tsv', '.csv', '.jpg', '.jpeg', '.png', '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.loom', '.h5', '.h5ad', '.h5an',
  '.ipynb', '.Rda', '.rda', '.Rds', '.rds']
const sequenceExtensions = ['.fq', '.fastq', '.fq.tar.gz', '.fastq.tar.gz', '.fq.gz', '.fastq.gz', '.bam']
const baiExtensions = ['.bai']

export const FileTypeExtensions = {
  plainText: plainTextExtensions.concat(plainTextExtensions.map(ext => `${ext}.gz`)),
  mtx: mtxExtensions.concat(mtxExtensions.map(ext => `${ext}.gz`)),
  image: imageExtensions,
  misc: miscExtensions.concat(miscExtensions.map(ext => `${ext}.gz`)),
  sequence: sequenceExtensions,
  bai: baiExtensions
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
    let newName = selectedFile.name
    // for cluster files, don't change an existing specified name
    if (file.file_type == 'Cluster' && file.name && file.name != file.upload_file_name) {
      newName = file.name
    }
    updateFile(file._id, {
      uploadSelection: selectedFile,
      name: newName
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
