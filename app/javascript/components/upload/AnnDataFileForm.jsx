import React from 'react'

import ExpandableFileForm from './ExpandableFileForm'
import { FileTypeExtensions } from './upload-utils'
import { TextFormField } from './form-components'
import { validateFile } from './upload-utils'

const allowedFileExts = FileTypeExtensions.annData

/** Renders a form for editing/uploading an AnnData file */
export default function AnnDataFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  bucketName,
  isInitiallyExpanded
}) {
  const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
  </ExpandableFileForm>
}
