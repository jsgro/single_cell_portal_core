import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'
import BucketImage from 'components/visualization/BucketImage'
import FileDownloadControl from 'components/download/FileDownloadControl'
import { validateFile } from './upload-utils'

/** renders a form for editing/uploading an image file */
export default function ImageFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters,
  bucketName
}) {

  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  const validationMessages = validateFile({ file, allFiles, allowedFileTypes: FileTypeExtensions.image })
  let imagePreviewUrl = '#'
  if (file.uploadSelection) {
    imagePreviewUrl = URL.createObjectURL(file.uploadSelection)
  }

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`imageForm-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-6 flexbox-align-center">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              updateFile={updateFile}
              allowedFileTypes={FileTypeExtensions.image}
              validationMessages={validationMessages}/>
            <FileDownloadControl
              file={file}
              bucketName={bucketName}
            />
          </div>
          <div className="col-md-6">
            { file.uploadSelection && <img className="preview-image" src={imagePreviewUrl} alt={file.uploadSelection.name} /> }
            { file.status == 'uploaded' && <BucketImage fileName={file.upload_file_name} bucketName={bucketName}/> }
          </div>
        </div>
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
        <div className="form-group">
          <label className="labeled-select">Corresponding clusters / spatial data:
            <Select options={associatedClusterFileOptions}
              data-analytics-name="image-associated-cluster"
              value={spatialClusterAssocs}
              isMulti={true}
              placeholder="None"
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
