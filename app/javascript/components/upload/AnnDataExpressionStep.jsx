import React, { useEffect } from 'react'

import ExpressionFileForm from './ExpressionFileForm'
import { rawCountsFileFilter, getExpressionFileInfoMessage } from './RawCountsStep'

const DEFAULT_NEW_PROCESSED_FILE = {
  is_spatial: false,
  expression_file_info: {
    is_raw_counts: false,
    biosample_input_type: 'Whole cell',
    modality: 'Transcriptomic: unbiased',
    raw_counts_associations: []
  },
  file_type: 'Expression Matrix'
}

const DEFAULT_NEW_RAW_COUNTS_FILE = {
  is_spatial: false,
  expression_file_info: {
    is_raw_counts: true,
    biosample_input_type: 'Whole cell',
    modality: 'Transcriptomic: unbiased',
    raw_counts_associations: []
  },
  file_type: 'Expression Matrix'
}

export const fileTypes = ['Expression Matrix', 'MM Coordinate Matrix']
export const processedFileFilter = file => fileTypes.includes(file.file_type) &&
  !file.expression_file_info?.is_raw_counts

export default {
  title: 'Expression matrices',
  header: 'Expression matrices',
  name: 'combined expression matrices',
  component: ExpressionUploadForm,
  fileFilter: processedFileFilter
}

/** form for uploading a parent expression file and any children */
function ExpressionUploadForm({
  formState,
  serverState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  isAnnDataExperience
}) {
  const processedParentFiles = formState.files.filter(processedFileFilter)
  const fileMenuOptions = serverState.menu_options
  const rawCountsFiles = formState.files.filter(rawCountsFileFilter).filter(
    f => f.status != 'new' && f.is_complete
  )
  const rawCountsOptions = rawCountsFiles.map(rf => ({ label: rf.name, value: rf._id }))

  const featureFlagState = serverState.feature_flags
  // const rawCountsRequired = featureFlagState && featureFlagState.raw_counts_required_frontend

  // const hasRawCounts = !!rawCountsFiles.filter(file => file.status === 'uploaded').length

  useEffect(() => {
    if (processedParentFiles.length === 0) {
      addNewFile(DEFAULT_NEW_PROCESSED_FILE)
    }
    // if (isAnnDataExperience) {
    //   // emily to do here
    //   const annDataParentFile = formState.files.find(file => file.file_type === 'AnnData')
    //   console.log('formState.allFiles', formState.allFiles)
    //   // updateFile(annDataParentFile._id, { other_form_fields_info: { file_type: 'Expression Matrix', DEFAULT_NEW_RAW_COUNTS_FILE } })
    // }
  }, [processedParentFiles.length])


  const rawParentFiles = formState.files.filter(rawCountsFileFilter)

  useEffect(() => {
    if (rawParentFiles.length === 0) {
      addNewFile(DEFAULT_NEW_RAW_COUNTS_FILE)
    }
  }, [rawParentFiles.length])

  const parentFiles = rawParentFiles.concat(processedParentFiles)

  
  return <div>
    <div className="row">
      <div className="col-md-12">
        {getExpressionFileInfoMessage(isAnnDataExperience, 'Processed')}
        { processedParentFiles.map(file => {
          return <ExpressionFileForm
            key={file.oldId ? file.oldId : file._id}
            file={file}
            allFiles={formState.files}
            updateFile={updateFile}
            saveFile={saveFile}
            deleteFile={deleteFile}
            addNewFile={addNewFile}
            rawCountsOptions={rawCountsOptions}
            fileMenuOptions={fileMenuOptions}
            bucketName={formState.study.bucket_id}
            isInitiallyExpanded={true}
            featureFlagState={featureFlagState}
            isAnnDataExperience={isAnnDataExperience}/>
        })}
      </div>
    </div>
  </div>
}
