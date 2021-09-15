import React from 'react'
import Select from 'react-select'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'
import BucketImage from 'components/visualization/BucketImage'


/** renders a form for editing/uploading an image file */
export default function ImageFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters,
  bucketName
}) {

  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  let imagePreviewUrl = '#'
  if (file.uploadSelection) {
    imagePreviewUrl = URL.createObjectURL(file.uploadSelection)
  }

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-6">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              updateFile={updateFile}
              allowedFileTypes={FileTypeExtensions.image}/>
          </div>
          <div className="col-md-6">
            { file.uploadSelection && <img className="preview-image" src={imagePreviewUrl} alt={file.uploadSelection.name} /> }
            { file.status == 'uploaded' && <BucketImage fileName={file.upload_file_name} bucketName={bucketName}/> }
          </div>
        </div>
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
        <div className="form-group">
          <label>Corresponding clusters / spatial data:</label><br/>
          <Select options={associatedClusterFileOptions}
            value={spatialClusterAssocs}
            isMulti={true}
            placeholder="None"
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
