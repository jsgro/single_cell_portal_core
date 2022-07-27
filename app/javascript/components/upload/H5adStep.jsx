import React, { useEffect } from 'react'

import H5adFileForm from './H5adFileForm'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_H5AD_FILE = {
  file_type: 'H5ad',
  options: {}
}

const H5adFileFilter = file => ['H5ad'].includes(file.file_type)

export default {
  title: 'Anndata (.h5ad)',
  header: 'Anndata files',
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
  useEffect(() => {
    if (H5adFiles.length === 0) {
      addNewFile(DEFAULT_NEW_H5AD_FILE)
    }
  }, [H5adFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <p className="form-terra">
          Anndata files, typically formatted with the file extension .h5ad.&nbsp;
          <a href="https://anndata.readthedocs.io" target="_blank" rel="noreferrer">
            See h5ad reference documentation.
          </a>
          <br></br>
          These files will not be used to power visualizations, but will be avaialble for users to download.
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
