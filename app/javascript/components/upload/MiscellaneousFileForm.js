import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'

/** renders a form for editing/uploading a miscellaneous file */
export default function MiscellaneousFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  miscFileTypes
}) {
  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`misc-file-form-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-12">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              updateFile={updateFile}/>
          </div>
        </div>
        <div className="form-group">
          <label className="labeled-select">File type:
            <Select options={miscFileTypes.map(ft => ({ label: ft, value: ft }))}
              data-analytics-name="misc-file-type"
              value={{ label: file.file_type, value: file.file_type }}
              onChange={val => updateFile(file._id, {file_type: val.value})}/>
          </label>
        </div>
        <div className="form-group">
          <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
        </div>
        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
