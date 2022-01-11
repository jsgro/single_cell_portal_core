import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faTimes, faCheck, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

import StepTabHeader from './StepTabHeader'
import { withErrorBoundary } from 'lib/ErrorBoundary'
import { OverlayTrigger, Popover } from 'react-bootstrap'
import { clusterFileFilter } from './ClusteringStep'
import { metadataFileFilter } from './MetadataStep'
import { processedFileFilter } from './ProcessedExpressionStep'
import LoadingSpinner from 'lib/LoadingSpinner'


/** renders a list of the steps and summary study information */
function RawWizardNavPanel({
  formState, serverState, currentStep, setCurrentStep, studyAccession, steps, studyName,
  mainSteps, supplementalSteps
}) {
  const [othersExpanded, setOthersExpanded] = useState(true)
  const expansionIcon = othersExpanded ? faChevronUp : faChevronDown

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
    <VisualizationStatuses serverState={serverState}/>
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

/** shows current expression and clustering visualization status */
function VisualizationStatuses({ serverState }) {
  if (!serverState) {
    return <></>
  }
  const metadataFiles = serverState.files.filter(metadataFileFilter)
  const isMetadataParsing = metadataFiles.some(f => f.parse_status === 'parsing')
  const isMetadataParsed = metadataFiles.some(f => f.parse_status === 'parsed')

  const clusteringFiles = serverState.files.filter(clusterFileFilter)
  const isClusteringParsing = isMetadataParsing || clusteringFiles.some(f => f.parse_status === 'parsing')
  const isClusteringParsed = isMetadataParsed && clusteringFiles.some(f => f.parse_status === 'parsed')

  const processedExpFiles = serverState.files.filter(processedFileFilter)
  const isExpressionParsing = isMetadataParsing || processedExpFiles.some(f => f.parse_status === 'parsing')
  const isExpressionParsed = isMetadataParsed && isClusteringParsed && processedExpFiles.some(f => f.parse_status === 'parsed')

  let clusterStatusMsg = <span className="success">clustering visuals <FontAwesomeIcon icon={faCheck}/></span>
  if (!isClusteringParsed) {
    clusterStatusMsg = <span className="warning">no cluster visuals <FontAwesomeIcon icon={faQuestionCircle}/></span>
  }
  const clusterVizIndicator = <div>
    <OverlayTrigger
      trigger={['hover', 'focus']}
      rootClose placement="top"
      overlay={clusteringHelpContent(isClusteringParsing)}>
      <span>
        {clusterStatusMsg} { isClusteringParsing && <LoadingSpinner/> }
      </span>
    </OverlayTrigger>
  </div>

  let expressionStatusMsg = <span className="success">expression visuals <FontAwesomeIcon icon={faCheck}/></span>
  if (!isExpressionParsed) {
    expressionStatusMsg = <span className="warning">no expression visuals <FontAwesomeIcon icon={faQuestionCircle}/></span>
  }
  const expressionVizIndicator = <div>
    <OverlayTrigger
      trigger={['hover', 'focus']}
      rootClose placement="top"
      overlay={expressionHelpContent(isExpressionParsing)}>
      <span>
        {expressionStatusMsg} { isExpressionParsing && <LoadingSpinner/> }
      </span>
    </OverlayTrigger>
  </div>
  return <div className="viz-notifications">
    {clusterVizIndicator}
    {expressionVizIndicator}
  </div>
}

/** gets the popup message based on whether there are files parsing */
function expressionHelpContent(isExpressionParsing) {
  return <Popover id="expression-viz-upload-info" className="tooltip-wide">
    <div> A processed matrix file, metadata file, and clustering file are required for gene expression visualization </div>
    { isExpressionParsing && parsingMessage }
  </Popover>
}

/** gets the popup message based on whether there are files parsing */
function clusteringHelpContent(isClusteringParsing) {
  return <Popover id="cluster-viz-upload-info" className="tooltip-wide">
    <div> A metadata file and a clustering file are required for cluster visualization</div>
    { isClusteringParsing && parsingMessage }
  </Popover>
}

const parsingMessage = <div> Some files which will impact visualization are currently being processed </div>

const WizardNavPanel = withErrorBoundary(RawWizardNavPanel)
export default WizardNavPanel
