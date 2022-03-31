import React from 'react'

import { FileTypeExtensions } from './upload-utils'
import { TextFormField } from './form-components'
import { validateFile } from './upload-utils'
import ExpandableFileForm from './ExpandableFileForm'

const allowedFileExts = FileTypeExtensions.plainText

/** renders a form for editing/uploading a miscellaneous file */
export default function GeneListFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  miscFileTypes,
  bucketName,
  isInitiallyExpanded
}) {
  const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
    <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
  </ExpandableFileForm>
}
