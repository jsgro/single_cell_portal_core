import React from 'react'

import { findBundleChildren } from './uploadUtils'

/** renders the wizard step header for a given step */
export default function StepTitle({ step, index, currentStep, setCurrentStep, serverState, formState }) {
  let stepFiles = []
  if (formState && formState.files) {
    stepFiles = formState.files.filter(step.fileFilter)
  }
  const className = step.name === currentStep.name ? 'active' : ''
  return <li className={className} onClick={() => setCurrentStep(step)}>
    <div>
      <span className="badge">{index + 1}</span>
    </div>
    <div>
      <a className="action link">
        {step.title}
      </a>
      <ul className="file-list">
        { stepFiles.map(file => {
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
      </ul>
    </div>
  </li>
}
