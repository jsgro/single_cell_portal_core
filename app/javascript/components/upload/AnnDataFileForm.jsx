import React from 'react'

import ExpandableFileForm from './ExpandableFileForm'
import { FileTypeExtensions, validateFile } from './upload-utils'
import { TextFormField } from './form-components'
import { useEffect } from 'react'

const allowedFileExts = FileTypeExtensions.annData

/** Renders a form for editing/uploading an AnnData file */
export default function AnnDataFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  bucketName,
  isInitiallyExpanded,
  isAnnDataExperience
}) {
  
  // const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, bucketName, isInitiallyExpanded, isAnnDataExperience
  }}>
    <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
  </ExpandableFileForm>
}
