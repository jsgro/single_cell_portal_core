import React from 'react'

import Select from '~/lib/InstrumentedSelect'
import ExpandableFileForm from './ExpandableFileForm'
import { FileTypeExtensions } from './upload-utils'
import { TextFormField } from './form-components'
import { validateFile } from './upload-utils'

const allowedFileExts = FileTypeExtensions.h5ad

/** renders a form for editing/uploading an h5ad file */
export default function H5adFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  h5adFileTypes,
  bucketName,
  isInitiallyExpanded
}) {
  console.log('allowedFileExts:', allowedFileExts)
  const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <div className="form-group">
      <label className="labeled-select">File type:
      <Select options={h5adFileTypes.map(ft => ({ label: ft, value: ft }))}
          data-analytics-name="h5ad-file-type"
          value={{ label: file.file_type, value: file.file_type }}
          onChange={val => updateFile(file._id, { file_type: val.value })}/>
      </label>
    </div>

    <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
  </ExpandableFileForm>
}
