import React, { useState } from 'react'
import ReactDOM from 'react-dom'


function RawCountsUploadForm() {
  return <span> Raw counts go here</span>
}

function ProcessedExpressionUploadForm() {
  return <span> Processed Expresion here</span>
}

function ClusteringUploadForm() {
  return <span>cluster all you want</span>
}

const STEPS = {
  rawCounts: {
    stepTitle: 'Raw Counts',
    formComponent: RawCountsUploadForm
  },
  processedExpression: {
    stepTitle: 'Processed Expression',
    formComponent: ProcessedExpressionUploadForm
  },
  clustering: {
    stepTitle: 'Clustering',
    formComponent: ClusteringUploadForm
  }
}

const STEP_ORDER = ['rawCounts', 'processedExpression', 'clustering']



export default function UploadWizard({ accession, name }) {
  const [currentStep, setCurrentStep] = useState(STEP_ORDER[0])
  const step = STEPS[currentStep]
  return <div>
    <div className="row">
      <div className="col-md-10 text-center">
        <h4>{accession}: {name}</h4>
      </div>
      <div className="col-md-2">
        <a href={`/single_cell/study/${accession}`}>View Study</a>
      </div>
    </div>
    <div className="row">
      <div className="col-md-3">
        <ul>
          { STEP_ORDER.map((stepName, index) => <StepTitle stepName={stepName} index={index} currentStep={currentStep} setCurrentStep={setCurrentStep}/>) }
        </ul>
      </div>
      <div className="col-md-9">
        <step.formComponent/>
      </div>
    </div>
  </div>
}

function StepTitle({ stepName, index, currentStep, setCurrentStep }) {
  const step = STEPS[stepName]
  return <li className={stepName === currentStep ? 'active' : ''}>
    <span>{index}. </span>
    <a className="action link" onClick={() => setCurrentStep(stepName)}>
      {step.stepTitle}
    </a>
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
