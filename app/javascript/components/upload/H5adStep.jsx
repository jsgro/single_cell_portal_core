import React, { useEffect } from 'react'

import H5adFileForm from './H5adFileForm'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_H5AD_FILE = {
  file_type: 'H5ad',
  options: {}
}

const H5adFileFilter = file => ['H5ad'].includes(file.file_type)

export default {
  title: 'H5ad',
  header: 'H5ad formatted file',
  name: 'H5ad',
  component: H5adForm,
  fileFilter: H5adFileFilter
}

/** Renders a form for uploading one or more h5ad files */
function H5adForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile
}) {
  const H5adFiles = formState.files.filter(H5adFileFilter)
console.log('H5adFiles:', H5adFiles)
  useEffect(() => {
    if (H5adFiles.length === 0) {
      addNewFile(DEFAULT_NEW_H5AD_FILE)
    }
  }, [H5adFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <p className="form-terra">
          H5ad formatted files. These will not be displayed directly, but will be avaialble for users to download.
        </p>
      </div>
    </div>
    { H5adFiles.map(file => {
      return <H5adFileForm
        key={file.oldId ? file.oldId : file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        h5adFileTypes={['H5ad']}
        bucketName={formState.study.bucket_id}
        isInitiallyExpanded={H5adFiles.length === 1}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_H5AD_FILE}/>
  </div>
}
