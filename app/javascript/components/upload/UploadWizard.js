import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'

import UploadSteps, { STEP_ORDER } from './UploadSteps'
import { fetchStudyFileInfo } from 'lib/scp-api'

/** shows the upload wizard */
export default function UploadWizard({ accession, name }) {
  const [currentStep, setCurrentStep] = useState(STEP_ORDER[0])
  const [studyState, setStudyState] = useState(null)
  const [formState, setFormState] = useState(null)

  if (studyState?.files && formState?.files) {
    formState.files.forEach(file => {
      const serverFile = studyState.files.find(sFile => sFile.id === file.id)
      if (!_isEqual(file, serverFile)) {
        file.isDirty = true
      }
    })
  }


  const step = UploadSteps[currentStep]
  useEffect(() => {
    fetchStudyFileInfo(accession).then(response => {
      setStudyState(response)
      setFormState(_cloneDeep(response))
    })
  }, [accession])
  return <div className="">
    <div className="row padded">
      <div className="col-md-10">
        <h4>{accession}: {name}</h4>
      </div>
      <div className="col-md-2">
        <a href={`/single_cell/study/${accession}`}>View Study</a>
      </div>
    </div>
    <div className="row">
      <div className="col-md-3">
        <ul className="upload-wizard-steps">
          { STEP_ORDER.map((stepName, index) =>
            <StepTitle key={index}
              stepName={stepName}
              index={index}
              formState={formState}
              studyState={studyState}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}/>) }
        </ul>
      </div>
      <div className="col-md-9">
        { !formState && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
        { !!formState && <step.formComponent
          formState={formState}
          setFormState={setFormState}
          studyState={studyState}
          setStudyState={setStudyState}/> }
      </div>
    </div>
  </div>
}

/** renders the wizard step header */
function StepTitle({ stepName, index, currentStep, setCurrentStep, studyState, formState }) {
  const step = UploadSteps[stepName]
  let stepFiles = []
  if (formState && formState.files) {
    stepFiles = formState.files.filter(step.fileFilter)
  }
  return <li className={stepName === currentStep ? 'active' : ''} onClick={() => setCurrentStep(stepName)}>
    <span className="badge">{index + 1}</span>
    <a className="action link">
      {step.stepTitle}
    </a>
    <ul className="fileList">
      { stepFiles.map(file => {
        let statusIcon = <span className="statusIcon"></span>
        if (file.status === 'new') {
          statusIcon = <span className="statusIcon fas fa-asterisk fa-sm"></span>
        }
        return <li key={file.name}>
          <span className={file.isDirty ? 'dirty' : ''}>{file.name} {statusIcon}</span>
        </li>
      })
      }
    </ul>
  </li>
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderUploadWizard(target, accession, name) {
  ReactDOM.render(
    <UploadWizard
      accession={accession}
      name={name}/>,
    target
  )
}
