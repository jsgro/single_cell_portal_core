import React from 'react'

/** renders the wizard step header for a given step */
export default function StepTitle({ step, index, currentStep, setCurrentStep, serverState, formState }) {
  let stepFiles = []
  if (formState && formState.files) {
    stepFiles = formState.files.filter(step.fileFilter)
  }
  const className = step.name === currentStep.name ? 'active' : ''
  return <li className={className} onClick={() => setCurrentStep(step)}>
    <div className="stepNumber">
      <span className="badge">{index + 1}</span>
    </div>
    <div className="stepContent">
      <a className="action link">
        {step.title}
      </a>
      <ul className="file-list">
        { stepFiles.map(file => {
          return <li key={file.name}>
            <span className={file.isDirty ? 'dirty' : ''}>{file.name}</span>
          </li>
        })
        }
      </ul>
    </div>
  </li>
}
