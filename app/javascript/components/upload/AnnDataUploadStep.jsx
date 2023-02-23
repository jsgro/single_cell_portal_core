import React, { useEffect, useState } from 'react'

import AnnDataFileForm from './AnnDataFileForm'
import { AddFileButton } from './form-components'
import { AnnDataFileFilter } from './AnnDataStep'
import { clusterFileFilter } from './ClusteringStep'
import { metadataFileFilter } from './MetadataStep'
import { processedFileFilter } from './ProcessedExpressionStep'


const DEFAULT_NEW_ANNDATA_FILE = {
  file_type: 'AnnData',
  other_form_fields_info: {},
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
  deleteFile,
  isAnnDataExperience,
  deleteFileFromForm
}) {
  const AnnDataFile = formState.files.filter(AnnDataFileFilter)

  useEffect(() => {
    // const other_form_fields_info = {}
    // formState.files.forEach(file => {
    //   if (file.file_type !== 'AnnData') {
    //     other_form_fields_info[file.file_type] = file
    //     deleteFileFromForm(file._id)
    //     console.log('deleted: ', file.file_type )
    //   }
    // })

    // const defAnnNew = {
    //   file_type: 'AnnData',
    //   other_form_fields_info
    //   // options: {}
    // }

    if (AnnDataFile.length === 0) {
      addNewFile(DEFAULT_NEW_ANNDATA_FILE)
    }
    // debugger
  }, [AnnDataFile.length])

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
    { AnnDataFile.map(file => {
      return <AnnDataFileForm
        key={file.oldId ? file.oldId : file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        annDataFileTypes={['AnnData']}
        bucketName={formState.study.bucket_id}
        isInitiallyExpanded={true}
        isAnnDataExperience={isAnnDataExperience}/>
    })}
  </div>
}
