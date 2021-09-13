/** React component for displaying the file upload wizard
 *
 * All the state for both the user's changes, and the state of the study as known from the server are
 * managed here as formState, and serverState, respectively.  This component owns many state-maniuplation
 * methods, like updateFile.  Any update to any file will trigger a re-render of the entire upload widget.
 */

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _cloneDeep from 'lodash/cloneDeep'
import _isMatch from 'lodash/isEqual'
import _uniqueId from 'lodash/uniqueId'

import UploadSteps, { STEP_ORDER } from './UploadSteps'
import { formatFileFromServer, formatFileForApi } from './uploadUtils'
import { createStudyFile, updateStudyFile, deleteStudyFile, fetchStudyFileInfo } from 'lib/scp-api'

/** shows the upload wizard */
export default function UploadWizard({ accession, name }) {
  const [currentStep, setCurrentStep] = useState(STEP_ORDER[0])
  const [serverState, setServerState] = useState(null)
  const [formState, setFormState] = useState(null)

  const step = UploadSteps[currentStep]

  // go through the files and compute any relevant derived properties, notably 'isDirty'
  if (serverState?.files && formState?.files) {
    formState.files.forEach(file => {
      const serverFile = serverState.files.find(sFile => sFile._id === file._id)
      // use isMatch to confirm that specified properties are equal, but ignore properties (like isDirty)
      // that only exist on the form state objects
      if (!_isMatch(file, serverFile)) {
        file.isDirty = true
      }
    })
  }

  /** adds an empty file, merging in the given fileProps. Does not communicate anything to the server */
  function addNewFile(fileProps) {
    const newFile = {
      study_id: serverState.study._id.$oid,
      name: '',
      _id: _uniqueId('newFile-'), // we just need a temp id to give to form controls, the real id will come from the server
      status: 'new',
      description: '',
      parse_status: 'unparsed',
      spatial_cluster_associations: []
    }
    Object.assign(newFile, fileProps)

    setFormState(prevFormState => {
      const newState = _cloneDeep(prevFormState)
      newState.files.push(newFile)
      return newState
    })
  }

  /** handle response from server after an upload by updating the serverState with the updated file response */
  function handleSaveResponse(response) {
    const updatedFile = formatFileFromServer(response)
    // first update the serverState
    setServerState(prevServerState => {
      const newServerState = _cloneDeep(prevServerState)
      const fileIndex = newServerState.files.findIndex(f => f._id === updatedFile._id)
      newServerState.files[fileIndex] = updatedFile
      return newServerState
    })
    // then update the form state
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      const fileIndex = newFormState.files.findIndex(f => f._id === updatedFile._id)
      newFormState.files[fileIndex] = updatedFile
      return newFormState
    })
  }

  /** Updates file fields by merging in the 'updates', does not perform any validation, and
   *  does not save to the server */
  function updateFile(fileId, updates) {
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      const fileChanged = newFormState.files.find(file => file._id === fileId)
      Object.assign(fileChanged, updates)
      return newFormState
    })
  }

  /** save the given file and perform an upload if a selected file is present */
  async function saveFile(file) {
    updateFile(file._id, { isSaving: true })
    const fileApiData = formatFileForApi(file)
    try {
      let response
      if (file.status === 'new') {
        response = await createStudyFile(file.study_id, fileApiData)
      } else {
        response = await updateStudyFile(file.study_id, file._id, fileApiData)
      }
      handleSaveResponse(response)
    } catch (error) {
      updateFile(file._id, {
        isError: true,
        isSaving: false,
        errorMessage: error.message
      })
    }
  }

  /** removes a file from the form only, does not touch server data */
  function deleteFileFromForm(fileId) {
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      newFormState.files = newFormState.files.filter(f => f._id != fileId)
      return newFormState
    })
  }

  /** delete the file from the form, and also the server if it exists there */
  function deleteFile(file) {
    if (file.status === 'new') {
      deleteFileFromForm(file._id)
    } else {
      updateFile(file._id, { isSaving: true })
      deleteStudyFile(file.study_id, file._id).then(response => {
        setServerState(prevServerState => {
          const newServerState = _cloneDeep(prevServerState)
          newServerState.files = newServerState.files.filter(f => f._id != file._id)
          return newServerState
        })
        deleteFileFromForm(file._id)
      })
    }
  }

  // on initial load, load all the details of the study and study files
  useEffect(() => {
    fetchStudyFileInfo(accession).then(response => {
      response.files.forEach(file => formatFileFromServer(file))
      setServerState(response)
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
              serverState={serverState}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}/>) }
        </ul>
      </div>
      <div className="col-md-9">
        { !formState && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
        { !!formState && <step.formComponent
          formState={formState}
          serverState={serverState}
          deleteFile={deleteFile}
          updateFile={updateFile}
          saveFile={saveFile}
          addNewFile={addNewFile}
          handleSaveResponse={handleSaveResponse}
        /> }
      </div>
    </div>
  </div>
}

/** renders the wizard step header for a given step */
function StepTitle({ stepName, index, currentStep, setCurrentStep, serverState, formState }) {
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
        return <li key={file.name}>
          <span className={file.isDirty ? 'dirty' : ''}>{file.name}</span>
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
