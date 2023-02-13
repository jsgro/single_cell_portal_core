import React, { useEffect } from 'react'

import AnnDataFileForm from './AnnDataFileForm'
import { AddFileButton } from './form-components'
import { AnnDataFileFilter } from './AnnDataStep'

const DEFAULT_NEW_ANNDATA_FILE = {
  file_type: 'AnnData',
  options: {}
}

export default {
  title: 'AnnData (.h5ad) 2',
  header: 'AnnData file',
  name: 'AnnData 2',
  component: AnnDataUploadStep,
  fileFilter: AnnDataFileFilter
}

/** Renders a form for uploading one or more AnnData files */
function AnnDataUploadStep({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile
}) {
  const AnnDataFiles = formState.files.filter(AnnDataFileFilter)
  useEffect(() => {
    if (AnnDataFiles.length === 0) {
      addNewFile(DEFAULT_NEW_ANNDATA_FILE)
    }
  }, [AnnDataFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <p className="form-terra">
          AnnData files, typically formatted with the file extension .h5ad.&nbsp;
          <a href="https://anndata.readthedocs.io" target="_blank" rel="noreferrer">
            See reference documentation
          </a>.
        </p>
      </div>
    </div>
    { AnnDataFiles.map(file => {
      return <AnnDataFileForm
        key={file.oldId ? file.oldId : file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        annDataFileTypes={['AnnData']}
        bucketName={formState.study.bucket_id}
        isInitiallyExpanded={AnnDataFiles.length === 1}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_ANNDATA_FILE}/>
  </div>
}
