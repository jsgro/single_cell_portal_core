import React, { useState } from 'react'

import { bytesToSize } from 'lib/stats'
import { validateFileContent } from 'lib/validation/validate-file-content'
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
  const [contentValidation, setContentValidation] = useState({ validating: false, result: null, filename: null })
  const inputId = `fileInput-${file._id}`

  /** handle user interaction with the file input */
  async function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    let newName = selectedFile.name
    // for cluster files, don't change an existing specified name
    if (file.file_type == 'Cluster' && file.name && file.name != file.upload_file_name) {
      newName = file.name
    }

    setContentValidation({ validating: true, result: null, filename: selectedFile.name })
    const validationResult = await validateFileContent(selectedFile, file.file_type)
    setContentValidation({ validating: false, result: validationResult, filename: selectedFile.name })
    if (validationResult.errors.length === 0) {
      updateFile(file._id, {
        uploadSelection: selectedFile,
        name: newName
      })
    }
  }
  let buttonText = file.upload_file_name ? 'Replace' : 'Choose file'
  if (contentValidation.validating) {
    buttonText = <LoadingSpinner data-testid="file-validation-spinner"/>
  }

  const contentErrors = contentValidation.result ? contentValidation.result.errors : []

  return <div className="form-group">
    <label>
      { !file.uploadSelection && <span>{file.upload_file_name}</span> }
      { file.uploadSelection && <span data-testid="file-selection-name">
        {file.uploadSelection.name}  ({bytesToSize(file.uploadSelection.size)})
      </span> }
    </label>
    &nbsp;
    <button className="fileinput-button terra-secondary-btn" id={`fileButton-${file._id}`}>
      { buttonText }
      <input className="file-upload-input" data-testid="file-input"
        type="file"
        id={inputId}
        onChange={handleFileSelection}
        accept={allowedFileTypes.join(',')}/>
    </button>
    { validationMessages['fileName'] &&
      <div className="validation-error" data-testid="file-name-validation">{validationMessages['fileName']}</div>
    }

    { contentErrors.length > 0 && <div className="validation-error" data-testid="file-content-validation">
      Could not use { contentValidation.filename}:
      <ul className="validation-error" >
        { contentErrors.map((error, index) => <li key={index} className="error-message">{error[2]}</li>) }
      </ul>
    </div> }
  </div>
}
