import React from 'react'

import StepTabHeader from './StepTabHeader'

/** renders a list of the steps and summary study information */
export default function WizardNavPanel({
  formState, serverState, currentStep, setCurrentStep, studyAccession, steps, studyName
}) {
  return <div className="position-fixed">
    <div className="padded">
      <h5><a href={`/single_cell/study/${studyAccession}`}>{studyAccession}</a>: {studyName}</h5>
    </div>
    <ul className="upload-wizard-steps">
      { steps.map((step, index) =>
        <StepTabHeader key={index}
          step={step}
          index={index}
          formState={formState}
          serverState={serverState}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}/>) }
    </ul>
  </div>
}
