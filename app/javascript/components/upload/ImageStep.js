import React, { useEffect } from 'react'

import ImageFileForm from './ImageFileForm'
import { clusterFileFilter } from './ClusteringStep'
import { AddFileButton } from './form-components'


const DEFAULT_NEW_IMAGE_FILE = {
  file_type: 'Image'
}

const imageFileFilter = file => file.file_type === 'Image'

export default {
  title: 'Reference Images',
  name: 'images',
  component: ImageForm,
  fileFilter: imageFileFilter
}

/** Renders a form for uploading one or more image files */
export function ImageForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile
}) {
  const imageFiles = formState.files.filter(imageFileFilter)
  const associatedClusterFileOptions = formState.files.filter(clusterFileFilter)
    .map(file => ({ label: file.name, value: file._id }))

  /** handle a change in the associated cluster select */
  function updateCorrespondingClusters(file, val) {
    let newVal = []
    if (val) {
      newVal = val.map(opt => opt.value)
    }
    updateFile(file._id, { spatial_cluster_associations: newVal })
  }

  useEffect(() => {
    if (imageFiles.length === 0) {
      addNewFile(DEFAULT_NEW_IMAGE_FILE)
    }
  }, [imageFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <h4>Reference Images</h4>
      </div>
    </div>
    <div className="row">
      <div className="col-md-12">
        <div className="form-terra">
          <p>An image file is a static image (.png, .jpeg) that is intended for view alongside cluster and/or expression data.  For example, an anatomical reference image to be dispalyed alongside spatial transcriptomics data</p>
          <p>Note also that if you want images to appear within your study <i>description</i> you can edit your description and use the toolbar to upload images inline</p>
        </div>
      </div>
    </div>
    { imageFiles.length > 1 && <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_IMAGE_FILE}/> }
    { imageFiles.map(file => {
      return <ImageFileForm
        key={file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        bucketName={formState.study.bucket_id}
        associatedClusterFileOptions={associatedClusterFileOptions}
        updateCorrespondingClusters={updateCorrespondingClusters}
        isInitiallyExpanded={imageFiles.length === 1}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_IMAGE_FILE}/>
  </div>
}
