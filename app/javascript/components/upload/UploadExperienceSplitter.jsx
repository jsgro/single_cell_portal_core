import React from 'react'

import { withErrorBoundary } from '~/lib/ErrorBoundary'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { Popover, OverlayTrigger } from 'react-bootstrap'

/** renders a list of the steps and summary study information */
function RawUploadExperienceSplitter({
  isAnnDataExperience, setIsAnnDataExperience, setShowSplitterStep
}) {
  return <div className="flexbox-align-center top-margin left-margin">
    <div>
    Helo Would you like to upload an Anndata File? Selecting Yes will put you on the AnnData experience, choosing no will go traditional
    </div>
    <div>
      <button
        className="btn terra-tertiary-btn"
        onClick={() => {
          setIsAnnDataExperience(true)
          setShowSplitterStep(false)
        }
        }>
 AnnData
      </button>
      <OverlayTrigger trigger="click" rootClose overlay={whyAnnDataExperienceExplanation}>
        <span> <FontAwesomeIcon data-analytics-name="anndata-explanation-popover"
          className="action log-click help-icon" icon={faInfoCircle}/></span>
      </OverlayTrigger><br/>
      <button
        className="btn terra-tertiary-btn"
        onClick={() => {
          setIsAnnDataExperience(false)
          setShowSplitterStep(false)
        }
        }>
Traditional
      </button>
      <OverlayTrigger trigger="click" rootClose overlay={traditionalExperienceExplanation}>
        <span> <FontAwesomeIcon data-analytics-name="anndata-explanation-popover"
          className="action log-click help-icon" icon={faInfoCircle}/></span>
      </OverlayTrigger>
    </div>
  </div>
}
const whyAnnDataExperienceExplanation = (
  <Popover id="anndata-experience-explanation">
    What is the AnnData Experience?<br/>

  </Popover>
)
const traditionalExperienceExplanation = (
  <Popover id="traditional-experience-explanation">
    What is the Traditional Experience?<br/>

  </Popover>
)


const UploadExperienceSplitter = withErrorBoundary(RawUploadExperienceSplitter)
export default UploadExperienceSplitter
