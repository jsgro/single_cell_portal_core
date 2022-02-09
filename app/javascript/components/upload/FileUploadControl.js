import React, { useState } from 'react'

import { bytesToSize } from 'lib/stats'
import { validateFileContent } from 'lib/validation/validate-file-content'
import FileDownloadControl from 'components/download/FileDownloadControl'
import LoadingSpinner from 'lib/LoadingSpinner'


const plainTextExtensions = ['.txt', '.tsv', '.text', '.csv']
const mtxExtensions = ['.mtx', '.mm', '.txt', '.text']
const imageExtensions = ['.jpeg', '.jpg', '.png', '.bmp']
const miscExtensions = ['.txt', '.text', '.tsv', '.csv', '.jpg', '.jpeg', '.png', '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.loom', '.h5', '.h5ad', '.h5an',
  '.ipynb', '.Rda', '.rda', '.Rds', '.rds']
const sequenceExtensions = ['.fq', '.fastq', '.fq.tar.gz', '.fastq.tar.gz', '.fq.gz', '.fastq.gz', '.bam']
const baiExtensions = ['.bai']

// File types which let the user set a custom name for the file in the UX
const FILE_TYPES_ALLOWING_SET_NAME = ['Cluster', 'Gene List', 'Image']

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
    const errorMsg = `A file named ${selectedFile.name} already exists in your study`
    return { errorMsgs: [errorMsg], warningMsgs: [] }
  }

  if (!allowedFileExts.includes('*') && !allowedFileExts.some(aft => selectedFile.name.endsWith(aft))) {
    const errorMsg = `Allowed extensions are ${allowedFileExts.join(' ')}`
    return { errorMsgs: [errorMsg], warningMsgs: [] }
  }

  const { errors, warnings } = await validateFileContent(selectedFile, file.file_type, {
    use_metadata_convention: file.use_metadata_convention
  })
  const errorMsgs = errors.map(error => error[2])
  const warningMsgs = warnings.map(error => error[2])
  return { errorMsgs, warningMsgs }
}

/** renders a file upload control for the given file object */
export default function FileUploadControl({
  file, allFiles, updateFile,
  allowedFileExts=['*'],
  validationMessages={},
  bucketName
}) {
  const [fileValidation, setFileValidation] = useState({
    validating: false, errorMsgs: [], warningMsgs: [], filename: null
  })
  const inputId = `file-input-${file._id}`

  /** handle user interaction with the file input */
  async function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    let newName = selectedFile.name

    // for cluster files, don't change an existing specified name
    if (FILE_TYPES_ALLOWING_SET_NAME.includes(file.file_type) && file.name && file.name !== file.upload_file_name) {
      newName = file.name
    }
    setFileValidation({ validating: true, errorMsgs: [], warningMsgs: [], filename: selectedFile.name })
    const { errorMsgs, warningMsgs } = await validateSelectedFile(selectedFile, file, allFiles, allowedFileExts)
    setFileValidation({ validating: false, errorMsgs, warningMsgs, filename: selectedFile.name })
    if (errorMsgs.length === 0) {
      updateFile(file._id, {
        uploadSelection: selectedFile,
        upload_file_name: newName,
        name: newName
      })
    }
  }
  const isFileChosen = !!file.upload_file_name
  const isFileOnServer = file.status !== 'new'

  let buttonText = isFileChosen ? 'Replace' : 'Choose file'
  let buttonClass = 'fileinput-button btn terra-tertiary-btn'
  if (!isFileChosen && !file.uploadSelection) {
    buttonClass = 'fileinput-button btn btn-primary'
  }
  if (fileValidation.validating) {
    buttonText = <LoadingSpinner data-testid="file-validation-spinner"/>
  }

  let inputAcceptExts = allowedFileExts
  if (navigator.platform.includes('Mac')) {
    // A longstanding OS X file picker limitation is that compound extensions (e.g. .txt.gz)
    // will not resolve at all, so we need to add the general .gz to permit gzipped files
    // see, e.g. https://bugs.chromium.org/p/chromium/issues/detail?id=521781
    inputAcceptExts = [...allowedFileExts, '.gz']
  }

  if (file.serverFile?.parse_status === 'failed') {
    // if the parse has failed, this filemight be deleted at any minute.  Just show the name, and omit any controls
    return <div>
      <label>
        { !file.uploadSelection && <h5 data-testid="file-uploaded-name">{file.upload_file_name}</h5> }
        { file.uploadSelection && <h5 data-testid="file-selection-name">
          {file.uploadSelection.name} ({bytesToSize(file.uploadSelection.size)})
        </h5> }
      </label>
    </div>
  }

  return <div>
    <label>
      { !file.uploadSelection && <h5 data-testid="file-uploaded-name">{file.upload_file_name}</h5> }
      { file.uploadSelection && <h5 data-testid="file-selection-name">
        {file.uploadSelection.name} ({bytesToSize(file.uploadSelection.size)})
      </h5> }
    </label>
    <FileDownloadControl
      file={file}
      bucketName={bucketName}
    />
    &nbsp;
    { !isFileOnServer &&
      <button className={buttonClass} id={`fileButton-${file._id}`} data-testid="file-input-btn">
        { buttonText }
        <input className="file-upload-input" data-testid="file-input"
          type="file"
          id={inputId}
          onChange={handleFileSelection}
          accept={inputAcceptExts.join(',')}/>
      </button>
    }

    { fileValidation.errorMsgs?.length > 0 && <div className="validation-error" data-testid="file-content-validation">
      Could not use {fileValidation.filename}:
      <ul className="validation-error" >
        { fileValidation.errorMsgs.map((error, index) => <li key={index} className="error-message">{error}</li>) }
      </ul>
    </div> }
    { fileValidation.warningMsgs?.length > 0 &&
      <div className="validation-warning" data-testid="file-content-validation">
        Warnings:
        <ul className="validation-warning">
          { fileValidation.warningMsgs.map((warn, index) => <li key={index} className="error-message">{warn}</li>) }
        </ul>
      </div>
    }
  </div>
}
