import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircle, faCheck } from '@fortawesome/free-solid-svg-icons'

import { PARSEABLE_TYPES } from './upload-utils'

// determines whether lists of file names are shown under the header
// this is too trivial to be worth a feature flag, but doesn't yet seem to be settled
// from a UX perspective, so we're keeping the ability to quickly toggle, at least for local demos
const SHOW_FILE_NAMES = false

/** renders the wizard step header for a given step */
export default function StepTabHeader({
  step, index, showIndex=true, currentStep, setCurrentStep, serverState, formState
}) {
  let stepFiles = []
  if (formState && formState.files) {
    stepFiles = formState.files.filter(step.fileFilter).filter(f => f.name)
  }
  const className = step.name === currentStep.name ? 'active' : ''
  // show at most three files per step, two if we also need room for the "and more"

  let displayedFiles = stepFiles
  let remainderText = null
  if (stepFiles.length > 3) {
    displayedFiles = stepFiles.slice(0, 2)
    remainderText = <span className="detail"> &nbsp; + {stepFiles.length - 2} more</span>
  }

  const stepHasValidFiles = stepFiles.some(f => f.status === 'uploaded' &&
    (f.parse_status === 'parsed' || !PARSEABLE_TYPES.includes(f.file_type)))

  const badgeTestId = `${step.name}-status-badge`
  let badgeContent = <span className="badge highlight" data-testid={badgeTestId}>{index + 1}</span>
  if (stepHasValidFiles) {
    badgeContent = <span className="badge complete" data-testid={badgeTestId}><FontAwesomeIcon icon={faCheck}/></span>
  } else if (!showIndex) {
    badgeContent = <span className="badge fa-xs" data-testid={badgeTestId}><FontAwesomeIcon icon={faCircle}/></span>
  }

  return <li className={className} role="tab">
    <button className="unset-background-border-style" onClick={() => setCurrentStep(step)} >
      <span className="step-number">
        {badgeContent}
      </span>
      <span className="action link">
        {step.title}
      </span>
      { SHOW_FILE_NAMES && <ul className="file-list">
        { displayedFiles.map(file => {
          // show different style depending on whether file is locally modified
          return <li key={file._id} onClick={() => setCurrentStep(step)}>
            <span className={file.isDirty ? 'dirty' : ''} title={file.name}>{file.name}</span>
          </li>
        })
        }
        { remainderText && <li>{remainderText}</li> }
      </ul> }
    </button>
  </li>
}
