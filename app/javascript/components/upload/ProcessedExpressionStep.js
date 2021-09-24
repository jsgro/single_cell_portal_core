import React, { useEffect, useContext } from 'react'

import ExpressionFileForm from './ExpressionFileForm'
import { rawCountsFileFilter, expressionFileStructureHelp } from './RawCountsStep'
import { UserContext } from 'providers/UserProvider'

const DEFAULT_NEW_PROCESSED_FILE = {
  is_spatial: false,
  expression_file_info: {
    is_raw_counts: false,
    biosample_input_type: 'Whole cell',
    modality: 'Transcriptomic: unbiased'
  },
  file_type: 'Expression Matrix'
}
const fileTypes = ['Expression Matrix', '10X Genes File', '10X Barcodes File', 'MM Coordinate Matrix']
export const parentFileTypes = ['Expression Matrix', 'MM Coordinate Matrix']
const processedFilter = file => fileTypes.includes(file.file_type) && !file.expression_file_info?.is_raw_counts

/** find the bundle children of 'file', if any, in the given 'files' list */
export function findBundleChildren(file, files) {
  return files.filter(f => f.options.matrix_file_name === file.name || f.options.matrix_id === file._id)
}

export default {
  title: 'Processed Matrix',
  name: 'processed',
  component: ProcessedUploadForm,
  fileFilter: processedFilter
}

/** placeholder */
function ProcessedUploadForm({
  formState,
  serverState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {
  const processedFiles = formState.files.filter(processedFilter)
  const processedParentFiles = processedFiles.filter(file => parentFileTypes.includes(file.file_type))
  const fileMenuOptions = serverState.menu_options

  const userState = useContext(UserContext)
  const featureFlagState = userState.featureFlagsWithDefaults
  const rawCountsRequired = featureFlagState && featureFlagState.raw_counts_required_frontend

  const hasRawCounts = !!formState.files.filter(rawCountsFileFilter).filter(file => file.status === 'uploaded').length
  const isEnabled = !rawCountsRequired || hasRawCounts

  useEffect(() => {
    if (processedFiles.length === 0) {
      addNewFile(DEFAULT_NEW_PROCESSED_FILE)
    }
  }, [processedFiles.length])

  return <div>
    <div className="row">
      <div className="col-md-12">
        <h4>Processed Expression Files</h4>
      </div>
    </div>

    { !isEnabled &&
      <div className="row">
        <div className="col-md-12">
          <br/>
          Uploading a raw count matrix is now required in order to access to processed matrix uploads.
          <br/>
          <br/>
          If you are unable or do not wish to upload a raw count matrix, you can request an exemption using the link below.
          <br/>
          <br/>
          <div className="row">
            <div className="col-md-3 col-md-offset-2">
              <a href="" className="action"><span className="fas fa-chevron-circle-left"></span> Upload Raw Count File</a>
            </div>
            <div className="col-md-3 col-md-offset-1">
              <a href="https://singlecell.zendesk.com/hc/en-us/requests/new?ticket_form_id=1260811597230"
                className="action"
                rel="noopener noreferrer">Request Exemption <span className="fas fa-external-link-alt"></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    }

    { isEnabled && <>
      <div className="row">
        <div className="col-md-12">
          <div className="form-terra">
            <div className="row">
              <div className="col-md-12">
                <p>Processed matrix data is used to support gene expression visualizations. Gene expression scores can be uploaded in either of two file types:</p>
              </div>
            </div>
            { expressionFileStructureHelp }
          </div>
        </div>
      </div>

      { processedParentFiles.map(file => {
        const associatedChildren = findBundleChildren(file, processedFiles)

        return <ExpressionFileForm
          key={file._id}
          file={file}
          updateFile={updateFile}
          saveFile={saveFile}
          deleteFile={deleteFile}
          addNewFile={addNewFile}
          handleSaveResponse={handleSaveResponse}
          fileMenuOptions={fileMenuOptions}
          associatedChildren={associatedChildren}/>
      })}
      <div className="row top-margin">
        <button className="btn btn-secondary action" onClick={() => addNewFile(DEFAULT_NEW_PROCESSED_FILE)}><span className="fas fa-plus"></span> Add File</button>
      </div>
    </> }

  </div>
}
