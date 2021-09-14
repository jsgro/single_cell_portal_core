import React, { useEffect } from 'react'

import ImageFileForm from './ImageFileForm'
import { clusterFileFilter } from './ClusteringStep'

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

/** Renders a form for uploading one or more cluster/spatial files */
export function ImageForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
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
      <h4 className="col-sm-12">5. Reference Images</h4>
    </div>
    <div className="row">
      <br/>
      <p className="col-sm-12 text-center">An image file is a static image (.png, .jpeg) that is intended for view alongside cluster and/or expression data.  For example, an anatomical reference image to be dispalyed alongside spatial transcriptomics data</p>
      <p className="col-sm-12 text-center">Note also that if you want images to appear within your study <i>description</i> you can edit your description and use the toolbar to upload images inline</p>
    </div>

    { imageFiles.map(file => {
      return <ImageFileForm
        key={file._id}
        file={file}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        handleSaveResponse={handleSaveResponse}
        associatedClusterFileOptions={associatedClusterFileOptions}
        updateCorrespondingClusters={updateCorrespondingClusters}/>
    })}
    <div className="row top-margin">
      <button className="btn btn-secondary action" onClick={() => addNewFile(DEFAULT_NEW_IMAGE_FILE)}><span className="fas fa-plus"></span> Add File</button>
    </div>
  </div>
}
