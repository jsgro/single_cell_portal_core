import React from 'react'

import FileUploadControl from './FileUploadControl'

import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'

/** renders a form for editing/uploading a miscellaneous file */
export default function GeneListFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  miscFileTypes,
  bucketName
}) {
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
              updateFile={updateFile}
              bucketName={bucketName}/>
          </div>
        </div>

        <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>

        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
