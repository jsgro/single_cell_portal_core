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
  header: 'Seurat data files',
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
          These files will not be used to power visualizations, but will be avaialble for users to download.
          <br></br>
          See reference documentation&nbsp;
          <a href="https://mojaveazure.github.io/seurat-disk/articles/h5Seurat-load.html" target="_blank" rel="noreferrer">
           here
          </a>
          &nbsp;and&nbsp;
          <a href="https://mojaveazure.github.io/seurat-disk/articles/h5Seurat-spec.html" target="_blank" rel="noreferrer">
            here
          </a>.
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
