import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'

/** renders a form for editing/uploading an image file */
export default function CoordinateLabelForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters
}) {

  const associatedCluster = associatedClusterFileOptions.find(opt => opt.value === file.options.cluster_file_id)

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`labelForm-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-12">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              updateFile={updateFile}
              allowedFileTypes={FileTypeExtensions.plainText}/>
          </div>
        </div>
        <div className="form-group">
          <label className="labeled-select">Corresponding clusters / spatial data:
            <Select options={associatedClusterFileOptions}
              data-analytics-name="coordinate-labels-corresponding-cluster"
              id={`coordCluster-${file._id}`}
              value={associatedCluster}
              placeholder="Select one..."
              onChange={val => updateCorrespondingClusters(file, val)}/>
          </label>
        </div>
        <div className="form-group">
          <TextFormField label="Description / Legend (this will be displayed below image)" fieldName="description" file={file} updateFile={updateFile}/>
        </div>
        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
