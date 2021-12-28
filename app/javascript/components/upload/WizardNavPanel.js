import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons'

import StepTabHeader from './StepTabHeader'
import { withErrorBoundary } from 'lib/ErrorBoundary'
import { OverlayTrigger, Popover } from 'react-bootstrap'


/** renders a list of the steps and summary study information */
function RawWizardNavPanel({
  formState, serverState, currentStep, setCurrentStep, studyAccession, steps, studyName,
  mainSteps, supplementalSteps
}) {
  const [othersExpanded, setOthersExpanded] = useState(true)
  const expansionIcon = othersExpanded ? faChevronUp : faChevronDown

  let clusterVizIndicator = <li className="success detail"><FontAwesomeIcon icon={faCheck}/> cluster viz. enabled</li>
  if (!serverState?.study.can_visualize_clusters) {
    clusterVizIndicator = <li className="warning detail">
      <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="top" overlay={clusterHelpContent}>
        <span><FontAwesomeIcon icon={faTimes}/> cluster viz. not enabled</span>
      </OverlayTrigger>
    </li>
  }

  let expressionVizIndicator = <li className="success detail"><FontAwesomeIcon icon={faCheck}/> expression viz. enabled</li>
  if (!serverState?.study.has_visualization_matrices) {
    expressionVizIndicator = <li className="warning detail">
      <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="top" overlay={expressionHelpContent}>
        <span><FontAwesomeIcon icon={faTimes}/> expression viz. not enabled</span>
      </OverlayTrigger>
    </li>
  }

  return <div className="position-fixed">
    <ul className="upload-wizard-steps" role="tablist" data-analytics-name="upload-wizard-primary-steps">
      { mainSteps.map((step, index) =>
        <StepTabHeader key={index}
          step={step}
          index={index}
          formState={formState}
          serverState={serverState}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}/>) }
    </ul>
    { serverState &&
      <ul className="viz-notifications">
        {clusterVizIndicator}
        {expressionVizIndicator}
      </ul>
    }
    <ul className="upload-wizard-steps" role="tablist" data-analytics-name="upload-wizard-secondary-steps">
      <li className="other-header" role="tab" >
        <button className="unset-background-border" onClick={() => setOthersExpanded(!othersExpanded)} >
          <span className="step-number">
            <span className="badge highlight">+</span>
          </span>
          <span>
            <a className="action link" role="link">
            Other files <FontAwesomeIcon icon={expansionIcon}/>
            </a>
          </span>
        </button>
      </li>
      { othersExpanded && supplementalSteps.map((step, index) =>
        <StepTabHeader key={index}
          step={step}
          index={index}
          showIndex={false}
          formState={formState}
          serverState={serverState}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}/>) }
    </ul>
  </div>
}

const expressionHelpContent = <Popover id="expression-viz-upload-info" className="tooltip-wide">
  <div> A metadata file and a processed matrix are required for gene expression visualization </div>
</Popover>

const clusterHelpContent = <Popover id="expression-viz-upload-info" className="tooltip-wide">
  <div> A metadata file and a clustering file are required for cluster visualization </div>
</Popover>

const WizardNavPanel = withErrorBoundary(RawWizardNavPanel)
export default WizardNavPanel
