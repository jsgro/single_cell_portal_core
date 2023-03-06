import React from 'react'

import { withErrorBoundary } from '~/lib/ErrorBoundary'
import { navigate } from '@reach/router'

/** renders a list of the steps and summary study information */
function RawUploadExperienceSplitter({
  setIsAnnDataExperience, studyAccession,
  setCurrentStep, setChoiceMade
}) {

  navigate('?tab=fileuploadchoice')

  return <div className="top-margin left-margin">
    <div className="row">
      <div >
        <h1>
        Introducing AnnData file upload to power visualizations
        </h1>
        <div className="splitter-info-outside ">
          <div className='split-title'>
          Choose how to upload expression, conventional metadata, and cluster data
          </div>
          <div className='flex-grid'>
            <div className='flex-cols'>
              <a
                className="btn splitter-info-buttons"
                onClick={() => {
                  setIsAnnDataExperience(false)
                  // setShowSplitterStep(false)
                  setChoiceMade(true)
                  // setCurrentStep('?tab=rawCounts')
                }}> Classic
              </a>
              <div className='col'>
                Upload multiple files in SCP format
              </div>
            </div>
            <div className='flex-cols'>
              <a
                className="btn splitter-info-buttons"
                onClick={() => {
                  setIsAnnDataExperience(true)
                  // setShowSplitterStep(false)
                  setChoiceMade(true)
                  // setCurrentStep('?tab=combined%20expression%20matrices')
                }}> AnnData <sup>BETA</sup>
              </a>
              <div className='col'>
                Upload one AnnData (.h5ad) file
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

const UploadExperienceSplitter = withErrorBoundary(RawUploadExperienceSplitter)
export default UploadExperienceSplitter
