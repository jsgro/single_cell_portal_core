import React from 'react'

import { withErrorBoundary } from '~/lib/ErrorBoundary'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { Popover, OverlayTrigger } from 'react-bootstrap'

/** renders a list of the steps and summary study information */
function RawUploadExperienceSplitter({
  isAnnDataExperience, setIsAnnDataExperience, setShowSplitterStep, addNewFile
}) {
  const DEFAULT_NEW_ANNDATA_FILE = {
    file_type: 'AnnData',
    // other_form_fields_info: {},
    options: {}
  }

  return <div className="top-margin left-margin">
    <div className="row">
      <div >
        <h1 className='splitter-info-inside'>
        The Single Cell Portal is introducing a new file option!
        </h1>
        <div className="splitter-info-outside ">
          <div className='infee'>
            You can choose the classic Single Cell Portal upload experience or the new AnnData file experience.
          </div>
          <div className='flex-grid'>
            <div className='col'>
            The classic experience is the route that the portal has classically had where
            you upload a variety of individual files for different file types like, Metadata, Raw count expression matrices, etc.
              <br/>
              <a
                className="btn terra-secondary-btn"
                onClick={() => {
                  setIsAnnDataExperience(false)
                  setShowSplitterStep(false)
                }
                }>
                Classic
              </a>
              {/* <OverlayTrigger trigger="focus hover" rootClose overlay={classicExperienceExplanation}>
                <span> <FontAwesomeIcon data-analytics-name="anndata-explanation-popover"
                  icon={faInfoCircle}/></span>
              </OverlayTrigger> */}
            </div>
            <div className='col'>
            In the new AnnData experience you can upload a single AnnData file in place of expression files, a metadata file, and cluster files.
            You will still have the option to add x and y file types during AnnData experience.
              <br/>
              <a
                className="btn splitter-info-buttons"
                onClick={() => {
                  setIsAnnDataExperience(true)
                  setShowSplitterStep(false)
                  addNewFile(DEFAULT_NEW_ANNDATA_FILE)
                }
                }>
            AnnData
                {/* <OverlayTrigger trigger="hover" rootClose overlay={whyAnnDataExperienceExplanation}>
                  <span> <FontAwesomeIcon data-analytics-name="anndata-explanation-popover"
                    icon={faInfoCircle}/></span>
                </OverlayTrigger> */}
                <br/>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}
const whyAnnDataExperienceExplanation = (
  <Popover id="anndata-experience-explanation">
    <h5>What is the AnnData Experience?</h5><br/>
    This differs from the classic upload experience where you will upload a single AnnData
    file that will replace the invididual expression, cluster and metadata files you would upload
    during the classic experience.

  </Popover>
)
const classicExperienceExplanation = (
  <Popover id="classic-experience-explanation">
    <h5>What is the Classic Experience?</h5><br/>
    This is the classic experience of uploading files on the Single Cell Portal where you
    will have the option to upload invididual expression, cluster, and metadata files.
  </Popover>
)


const UploadExperienceSplitter = withErrorBoundary(RawUploadExperienceSplitter)
export default UploadExperienceSplitter
