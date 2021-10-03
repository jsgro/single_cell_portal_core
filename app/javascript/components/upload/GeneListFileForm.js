import React from 'react'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'
import { validateFile } from './upload-utils'

/** renders a form for editing/uploading a miscellaneous file */
export default function GeneListFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  miscFileTypes
}) {
  const validationMessages = validateFile({ file, allFiles, allowedFileTypes: FileTypeExtensions.plainText })
  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`gene-list-form-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-12">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              allowedFileTypes={FileTypeExtensions.plainText}
              validationMessages={validationMessages}
              updateFile={updateFile}/>
          </div>
        </div>

        <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>

        <SaveDeleteButtons {...{ file, updateFile, saveFile, deleteFile, validationMessages }}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
