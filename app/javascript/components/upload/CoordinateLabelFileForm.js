import React from 'react'
import Select from 'react-select'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'

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
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
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
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
        <div className="form-group">
          <label>Corresponding clusters / spatial data:</label><br/>
          <Select options={associatedClusterFileOptions}
            value={associatedCluster}
            placeholder="Select one"
            onChange={val => updateCorrespondingClusters(file, val)}/>
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
