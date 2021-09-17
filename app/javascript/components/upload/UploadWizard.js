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

import { formatFileFromServer, formatFileForApi, newStudyFileObj } from './uploadUtils'
import { createStudyFile, updateStudyFile, deleteStudyFile, fetchStudyFileInfo, sendStudyFileChunk } from 'lib/scp-api'
import MessageModal from 'lib/MessageModal'

import StepTabHeader from './StepTabHeader'
import ClusteringStep from './ClusteringStep'
import ImageStep from './ImageStep'
import CoordinateLabelStep from './CoordinateLabelStep'
import RawCountsStep from './RawCountsStep'
import ProcessedExpressionStep from './ProcessedExpressionStep'
import MetadataStep from './MetadataStep'

const CHUNK_SIZE = 10000000
const STEPS = [RawCountsStep, ProcessedExpressionStep, MetadataStep, ClusteringStep, CoordinateLabelStep, ImageStep]

/** shows the upload wizard */
export default function UploadWizard({ studyAccession, name }) {
  const [currentStep, setCurrentStep] = useState(STEPS[0])
  const [serverState, setServerState] = useState(null)
  const [formState, setFormState] = useState(null)

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
    const newFile = newStudyFileObj(serverState.study._id.$oid)
    Object.assign(newFile, fileProps)

    setFormState(prevFormState => {
      const newState = _cloneDeep(prevFormState)
      newState.files.push(newFile)
      return newState
    })
  }

  /** handle response from server after an upload by updating the serverState with the updated file response */
  function handleSaveResponse(response, uploadingMoreChunks) {
    const updatedFile = formatFileFromServer(response)
    // first update the serverState
    setServerState(prevServerState => {
      const newServerState = _cloneDeep(prevServerState)
      const fileIndex = newServerState.files.findIndex(f => f.name === updatedFile.name)
      newServerState.files[fileIndex] = updatedFile
      return newServerState
    })
    // then update the form state
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      const fileIndex = newFormState.files.findIndex(f => f.name === updatedFile.name)
      const formFile = _cloneDeep(updatedFile)
      if (uploadingMoreChunks) {
        formFile.isSaving = true
      }
      newFormState.files[fileIndex] = formFile
      return newFormState
    })
  }

  /** Updates file fields by merging in the 'updates', does not perform any validation, and
   *  does not save to the server */
  function updateFile(fileId, updates) {
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      const fileChanged = newFormState.files.find(f => f._id === fileId)
      if (!fileChanged) { // we're updating a stale/no-longer existent file -- discard it
        return prevFormState
      }
      Object.assign(fileChanged, updates)
      return newFormState
    })
  }

  /** save the given file and perform an upload if a selected file is present */
  async function saveFile(file) {
    let studyFileId = file._id
    updateFile(studyFileId, { isSaving: true })
    const fileSize = file.uploadSelection?.size
    const isChunked = fileSize > CHUNK_SIZE
    let chunkStart = 0
    let chunkEnd = Math.min(CHUNK_SIZE, fileSize)

    const studyFileData = formatFileForApi(file, chunkStart, chunkEnd)
    try {
      let response
      if (file.status === 'new') {
        response = await createStudyFile({
          studyAccession, studyFileData, isChunked, chunkStart, chunkEnd, fileSize
        })
      } else {
        response = await updateStudyFile({
          studyAccession, studyFileId, studyFileData, isChunked, chunkStart, chunkEnd, fileSize
        })
      }
      handleSaveResponse(response, isChunked)
      studyFileId = response._id
      if (isChunked) {
        while (chunkEnd < fileSize) {
          chunkStart += CHUNK_SIZE
          chunkEnd = Math.min(chunkEnd + CHUNK_SIZE, fileSize)
          const chunkApiData = formatFileForApi(file, chunkStart, chunkEnd)
          response = await sendStudyFileChunk({
            studyAccession, studyFileId, studyFileData: chunkApiData, chunkStart, chunkEnd, fileSize
          })
        }
        updateFile(studyFileId, { isSaving: false })
      }

    } catch (error) {
      updateFile(studyFileId, {
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
  async function deleteFile(file) {
    if (file.status === 'new') {
      deleteFileFromForm(file._id)
    } else {
      updateFile(file._id, { isDeleting: true })
      try {
        await deleteStudyFile(studyAccession, file._id)
        setServerState(prevServerState => {
          const newServerState = _cloneDeep(prevServerState)
          newServerState.files = newServerState.files.filter(f => f._id != file._id)
          return newServerState
        })
        deleteFileFromForm(file._id)
      } catch (error) {
        updateFile(file._id, {
          isError: true,
          isDeleting: false,
          errorMessage: error.message
        })
      }
    }
  }

  // on initial load, load all the details of the study and study files
  useEffect(() => {
    fetchStudyFileInfo(studyAccession).then(response => {
      response.files.forEach(file => formatFileFromServer(file))
      setServerState(response)
      setFormState(_cloneDeep(response))
    })
  }, [studyAccession])

  return <div className="">
    <div className="row padded">
      <div className="col-md-10">
        <h4>{studyAccession}: {name}</h4>
      </div>
      <div className="col-md-2">
        <a href={`/single_cell/study/${studyAccession}`}>View Study</a>
      </div>
    </div>
    <div className="row">
      <div className="col-md-3">
        <ul className="upload-wizard-steps">
          { STEPS.map((step, index) =>
            <StepTabHeader key={index}
              step={step}
              index={index}
              formState={formState}
              serverState={serverState}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}/>) }
        </ul>
      </div>
      <div className="col-md-9">
        { !formState && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
        { !!formState && <currentStep.component
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
    <MessageModal/>
  </div>
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderUploadWizard(target, accession, name) {
  ReactDOM.render(
    <UploadWizard
      studyAccession={accession}
      name={name}/>,
    target
  )
}
