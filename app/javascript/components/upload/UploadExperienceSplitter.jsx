import React from 'react'

import { withErrorBoundary } from '~/lib/ErrorBoundary'

/** renders a list of the steps and summary study information */
function RawUploadExperienceSplitter({
  isAnnDataExperience, setIsAnnDataExperience, setShowSplitterStep, addNewFile
}) {
  const DEFAULT_NEW_ANNDATA_FILE = {
    file_type: 'AnnData',
    options: {}
  }

  return <div className="top-margin left-margin">
    <div className="row">
      <div >
        <h1 className='splitter-info-inside'>
        Introducing AnnData file upload to power visualizations
        </h1>
        <div className="splitter-info-outside ">
        <div className='split-title'>
          Choose how to upload data
          </div>
          <div className='flex-grid'>
            <div className='flex-cols'>

              <div className='col'>
              Classic upload supports multiple individual files, like a metadata file, expression files, and cluster files.
              </div>
              <a
                className="btn splitter-info-buttons"
                onClick={() => {
                  setIsAnnDataExperience(false)
                  setShowSplitterStep(false)
                }
                }>
                Classic
              </a>
            </div>

            <div className='flex-cols'>
              <div className='col'>
            AnnData upload supports one AnnData (.h5ad) file per study, containing expression, metadata, and cluster data.
                Metadata Convention compliance is still needed for visualization, and other files types are still uploaded separately.
              </div>
              <a
                className="btn terra-secondary-btn"
                onClick={() => {
                  setIsAnnDataExperience(true)
                  setShowSplitterStep(false)
                  addNewFile(DEFAULT_NEW_ANNDATA_FILE)
                }
                }>
                AnnData <sup>BETA</sup>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

const UploadExperienceSplitter = withErrorBoundary(RawUploadExperienceSplitter)
export default UploadExperienceSplitter
