import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'
import { validateFile } from './upload-utils'

/** renders a form for editing/uploading a miscellaneous file */
export default function MiscellaneousFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  miscFileTypes,
  bucketName
}) {
  const validationMessages = validateFile({ file, allFiles, allowedFileTypes: FileTypeExtensions.misc })
  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`misc-file-form-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-12">
            <FileUploadControl
              file={file}
              updateFile={updateFile}
              allowedFileTypes={FileTypeExtensions.misc}
              validationMessages={validationMessages}
              bucketName={bucketName}/>
          </div>
        </div>
        <div className="form-group">
          <label className="labeled-select">File type:
            <Select options={miscFileTypes.map(ft => ({ label: ft, value: ft }))}
              data-analytics-name="misc-file-type"
              value={{ label: file.file_type, value: file.file_type }}
              onChange={val => updateFile(file._id, { file_type: val.value })}/>
          </label>
        </div>

        <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>

        <SaveDeleteButtons {...{ file, updateFile, saveFile, deleteFile, validationMessages }}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
