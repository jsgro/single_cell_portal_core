import React, { useState } from 'react'

import { bytesToSize } from 'lib/stats'
import { validateFileContent } from 'lib/validate-file-content'
import LoadingSpinner from 'lib/LoadingSpinner'

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
  allowedFileTypes=['*'],
  validationMessages={}
}) {
  const [contentValidation, setContentValidation] = useState({ validating: false, result: null })
  const inputId = `fileInput-${file._id}`

  /** handle user interaction with the file input */
  async function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    let newName = selectedFile.name
    // for cluster files, don't change an existing specified name
    if (file.file_type == 'Cluster' && file.name && file.name != file.upload_file_name) {
      newName = file.name
    }

    setContentValidation({ validating: true, result: null })
    const validationResult = await validateFileContent(file, file.file_type)
    setContentValidation({ validating: false, result: validationResult })
    if (validationResult.errors.length === 0) {
      updateFile(file._id, {
        uploadSelection: selectedFile,
        name: newName
      })
    }
  }
  let buttonText = file.upload_file_name ? 'Change file' : 'Choose file'
  if (contentValidation.validating) {
    buttonText = <LoadingSpinner/>
  }
  let allErrors = []
  if (validationMessages['fileName']) {
    allErrors.push(validationMessages['fileName'])
  }
  if (contentValidation?.result?.errors) {
    allErrors = allErrors.concat(contentValidation?.result?.errors)
  }

  return <div className="form-group">
    <label>File{ file.status !== 'new' && <span>: {file.upload_file_name}</span> }</label>
    <br/>
    <button className="fileinput-button btn btn-secondary" id={`fileButton-${file._id}`}>
      { buttonText }
      <input className="file-upload-input" data-testid="file-input"
        type="file"
        id={inputId}
        onChange={handleFileSelection}
        accept={allowedFileTypes.join(',')}/>
    </button>
    { file.uploadSelection &&
      <span data-testid="file-selection-name">
        &nbsp; {file.uploadSelection.name} ({bytesToSize(file.uploadSelection.size)})
      </span>
    }
    { allErrors.length > 0 && <div className="validation-error" data-testid="file-name-validation">
      { allErrors.map((error, index) => <div key={index} className="error-message">{error}</div>) }
    </div> }
  </div>
}
