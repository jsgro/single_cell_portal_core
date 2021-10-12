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

/** checks name uniqueness, file extension, and then file content.
 * The first two checks short-circuit the latter, since those will often just mean the user
 * has selected the wrong file, and showing a string of validation errors would be confusing
 * @param selectedFile {File} the File object from the input
 * @param file {StudyFile} the JS object corresponding to the StudyFile
 * @param allFiles {StudyFile[]} the array of all files for the study, used for name uniqueness checks
 * @param allowedFileExts { String[] } array of allowable extensions, ['*'] for all
 */
async function validateSelectedFile(selectedFile, file, allFiles, allowedFileExts=['*']) {
  const otherFiles = allFiles.filter(f => f._id != file._id)
  const otherNames = otherFiles.map(f => f.name)
  const otherUploadFileNames = otherFiles.map(f => f.upload_file_name)
  const otherSelectedFileNames = otherFiles.map(f => f.uploadSelection?.name)

  if (otherNames.includes(selectedFile.name) ||
    otherUploadFileNames.includes(selectedFile.name) ||
    otherSelectedFileNames.includes(selectedFile.name)) {
    return [`A file named ${selectedFile.name} already exists in your study`]
  }

  if (!allowedFileExts.includes('*') && !allowedFileExts.some(aft => selectedFile.name.endsWith(aft))) {
    const errorMsg = `Allowed extensions are ${allowedFileExts.join(' ')}`
    return [errorMsg]
  }

  const validationResult = await validateFileContent(selectedFile, file.file_type)
  const errorMsgs = validationResult.errors.map(error => error[2])
  return errorMsgs
}

/** renders a file upload control for the given file object */
export default function FileUploadControl({
  file, allFiles, updateFile,
  allowedFileExts=['*'],
  validationMessages={}
}) {
  const [fileValidation, setFileValidation] = useState({ validating: false, errorMsgs: [], filename: null })
  const inputId = `file-input-${file._id}`

  /** handle user interaction with the file input */
  async function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    let newName = selectedFile.name
    // for cluster files, don't change an existing specified name
    if (file.file_type == 'Cluster' && file.name && file.name != file.upload_file_name) {
      newName = file.name
    }
    setFileValidation({ validating: true, errorMsgs: [], filename: selectedFile.name })
    const errorMsgs = await validateSelectedFile(selectedFile, file, allFiles, allowedFileExts)
    setFileValidation({ validating: false, errorMsgs, filename: selectedFile.name })
    if (errorMsgs.length === 0) {
      updateFile(file._id, {
        uploadSelection: selectedFile,
        name: newName
      })
    }
  }
  let buttonText = file.upload_file_name ? 'Replace' : 'Choose file'
  if (fileValidation.validating) {
    buttonText = <LoadingSpinner data-testid="file-validation-spinner"/>
  }

  const inputAcceptExts = allowedFileExts
  if (navigator.platform.includes('Mac')) {
    // A longstanding OS X file picker limitation is that compound extensions (e.g. .txt.gz)
    // will not resolve at all, so we need to add the general .gz to permit gzipped files
    // see, e.g. https://bugs.chromium.org/p/chromium/issues/detail?id=521781
    inputAcceptExts.push('.gz')
  }

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
        accept={inputAcceptExts.join(',')}/>
    </button>

    { fileValidation.errorMsgs.length > 0 && <div className="validation-error" data-testid="file-content-validation">
      Could not use {fileValidation.filename}:
      <ul className="validation-error" >
        { fileValidation.errorMsgs.map((error, index) => <li key={index} className="error-message">{error}</li>) }
      </ul>
    </div> }
  </div>
}
