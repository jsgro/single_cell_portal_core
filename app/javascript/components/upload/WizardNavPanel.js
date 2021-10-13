import React from 'react'

import StepTabHeader from './StepTabHeader'
import { withErrorBoundary } from 'lib/ErrorBoundary'


/** renders a list of the steps and summary study information */
function RawWizardNavPanel({
  formState, serverState, currentStep, setCurrentStep, studyAccession, steps, studyName,
  mainSteps, supplementalSteps
}) {
  return <div className="position-fixed">
    <div className="padded">
      <h5><a href={`/single_cell/study/${studyAccession}`}>{studyAccession}</a>: {studyName}</h5>
    </div>
    <ul className="upload-wizard-steps">
      { mainSteps.map((step, index) =>
        <StepTabHeader key={index}
          step={step}
          index={index}
          formState={formState}
          serverState={serverState}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}/>) }
    </ul>
    <span>Other files</span>
    <ul className="upload-wizard-steps">
      { supplementalSteps.map((step, index) =>
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
