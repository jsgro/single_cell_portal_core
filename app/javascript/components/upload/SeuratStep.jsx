import React, { useEffect } from 'react'

import SeuratFileForm from './SeuratFileForm'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_H5AD_FILE = {
  file_type: 'Seurat',
  options: {}
}

const SeuratFileFilter = file => ['Seurat'].includes(file.file_type)

export default {
  title: 'Seurat data',
  header: 'Files formatted for Seurat data',
  name: 'Seurat',
  component: SeuratForm,
  fileFilter: SeuratFileFilter
}

/** Renders a form for uploading one or more seurat files */
function SeuratForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile
}) {
  const SeuratFiles = formState.files.filter(SeuratFileFilter)
  useEffect(() => {
    if (SeuratFiles.length === 0) {
      addNewFile(DEFAULT_NEW_H5AD_FILE)
    }
  }, [SeuratFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <p className="form-terra">
          Files that could be utilized for Seurat powered analsis.
          <br></br>
          This could include SeuratData (packaging datasets for use in R as reference Seurat datasets)
          and SeuratDisk (h5Seurat file format to ease interconversion between Seurat and AnnData).
          <br></br>
          These files will not be used to power visualizations, but will be avaialble for users to download.
        </p>
      </div>
    </div>
    { SeuratFiles.map(file => {
      return <SeuratFileForm
        key={file.oldId ? file.oldId : file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        seuratFileTypes={['Seurat']}
        bucketName={formState.study.bucket_id}
        isInitiallyExpanded={SeuratFiles.length === 1}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_H5AD_FILE}/>
  </div>
}
