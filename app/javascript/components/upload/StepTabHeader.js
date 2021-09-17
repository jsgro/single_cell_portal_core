import React from 'react'

/** renders the wizard step header for a given step */
export default function StepTitle({ step, index, currentStep, setCurrentStep, serverState, formState }) {
  let stepFiles = []
  if (formState && formState.files) {
    stepFiles = formState.files.filter(step.fileFilter)
  }
  const className = step.name === currentStep.name ? 'active' : ''
  return <li className={className} onClick={() => setCurrentStep(step)}>
    <span className="badge">{index + 1}</span>
    <a className="action link">
      {step.title}
    </a>
    <ul className="fileList">
      { stepFiles.map(file => {
        return <li key={file.name}>
          <span className={file.isDirty ? 'dirty' : ''}>{file.name}</span>
        </li>
      })
      }
    </ul>
  </li>
}
