import React from 'react'

import Select from 'lib/InstrumentedSelect'
import ExpandableFileForm from './ExpandableFileForm'
import { FileTypeExtensions } from './FileUploadControl'
import { TextFormField } from './form-components'
import BucketImage from 'components/visualization/BucketImage'
import { validateFile } from './upload-utils'

const allowedFileExts = FileTypeExtensions.image

/** renders a form for editing/uploading an image file */
export default function ImageFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  associatedClusterFileOptions,
  updateCorrespondingClusters,
  bucketName,
  isInitiallyExpanded
}) {
  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  let imagePreviewUrl = '#'
  if (file.uploadSelection) {
    imagePreviewUrl = URL.createObjectURL(file.uploadSelection)
  }

  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <div className="col-md-6">
      { file.uploadSelection && <img className="preview-image" src={imagePreviewUrl} alt={file.uploadSelection.name} /> }
      { file.status == 'uploaded' && <BucketImage fileName={file.upload_file_name} bucketName={bucketName}/> }
    </div>
    <br/>
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
  </ExpandableFileForm>
}
