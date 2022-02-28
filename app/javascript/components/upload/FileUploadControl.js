import React, { useState, useContext } from 'react'

import { bytesToSize } from 'lib/stats'
import FileDownloadControl from 'components/download/FileDownloadControl'
import LoadingSpinner from 'lib/LoadingSpinner'
import { StudyContext } from 'components/upload/upload-utils'
import { UserContext } from 'providers/UserProvider'
import { validateLocalFile } from 'lib/validation/validate-file'
import ValidationMessage from 'components/validation/ValidationMessage'

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


/** renders a file upload control for the given file object */
export default function FileUploadControl({
  file, allFiles, updateFile,
  allowedFileExts=['*'],
  validationIssues={},
  bucketName
}) {
  const [fileValidation, setFileValidation] = useState({
    validating: false, issues: {}, fileName: null
  })
  const inputId = `file-input-${file._id}`

  const study = useContext(StudyContext)
  const user = useContext(UserContext)

  console.log('user')
  console.log(user)

  /** handle user interaction with the file input */
  async function handleFileSelection(e) {
    const selectedFile = e.target.files[0]
    let newName = selectedFile.name

    // for cluster files, don't change an existing specified name
    if (FILE_TYPES_ALLOWING_SET_NAME.includes(file.file_type) && file.name && file.name !== file.upload_file_name) {
      newName = file.name
    }
    setFileValidation({ validating: true, issues: {}, fileName: selectedFile.name })
    const issues = await validateLocalFile(selectedFile, file, allFiles, allowedFileExts)
    setFileValidation({ validating: false, issues, fileName: selectedFile.name })
    if (issues.errors.length === 0) {
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

    <ValidationMessage
      studyAccession={study.accession}
      issues={fileValidation.issues}
      fileName={fileValidation.fileName}
    />
  </div>
}
