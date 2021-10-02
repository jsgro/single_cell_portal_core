import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'
import { validateFile } from './upload-utils'

/** renders a form for editing/uploading an coordinate label file */
export default function CoordinateLabelForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters
}) {

  const associatedCluster = associatedClusterFileOptions.find(opt => opt.value === file.options.cluster_file_id)
  const validationMessages = validateFile({ file, allFiles, allowedFileTypes: FileTypeExtensions.plainText })
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
              allowedFileTypes={FileTypeExtensions.plainText}
              validationMessages={validationMessages}/>
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
        <TextFormField label="Description / Legend (this will be displayed below image)" fieldName="description" file={file} updateFile={updateFile}/>
        <SaveDeleteButtons {...{ file, updateFile, saveFile, deleteFile, validationMessages }}/>
      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
