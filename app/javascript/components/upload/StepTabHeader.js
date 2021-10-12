import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'

import { findBundleChildren, PARSEABLE_TYPES } from './upload-utils'

/** renders the wizard step header for a given step */
export default function StepTitle({ step, index, currentStep, setCurrentStep, serverState, formState }) {
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

  return <li className={className}>
    <div onClick={() => setCurrentStep(step)}>
      <span className="badge">{index + 1}</span>
    </div>
    <div>
      <a className="action link" onClick={() => setCurrentStep(step)}>
        {step.title} { stepHasValidFiles && <FontAwesomeIcon icon={faCheckCircle}/> }
      </a>
      <ul className="file-list">
        { displayedFiles.map(file => {
          const bundleChildren = findBundleChildren(file, formState.files)
          // show different style depending on whether file is locally modified
          return <li key={file._id}>
            <span className={file.isDirty ? 'dirty' : ''} title={file.name}>{file.name}</span>
            { !!bundleChildren.length &&
              <ul>
                { bundleChildren.map(childFile => {
                  return <li key={childFile._id}>
                    <span className={childFile.isDirty ? 'dirty' : ''} title={childFile.name}>{childFile.name}</span>
                  </li>
                })}
              </ul>
            }
          </li>
        })
        }
        { remainderText && <li>{remainderText}</li> }
      </ul>
    </div>
  </li>
}
