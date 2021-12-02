import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'

import StepTabHeader from './StepTabHeader'
import { withErrorBoundary } from 'lib/ErrorBoundary'


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
    <ul className="upload-wizard-steps" role="tablist" data-analytics-name="upload-wizard-secondary-steps">
      <li className="other-header" role="tab" >
        <button className="unset-background-border-style" onClick={() => setOthersExpanded(!othersExpanded)} >
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

const WizardNavPanel = withErrorBoundary(RawWizardNavPanel)
export default WizardNavPanel
