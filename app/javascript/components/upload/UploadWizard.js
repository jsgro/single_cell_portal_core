/** React component for displaying the file upload wizard
 *
 * All the state for both the user's changes, and the state of the study as known from the server are
 * managed here as formState, and serverState, respectively.  This component owns many state-maniuplation
 * methods, like updateFile.  Any update to any file will trigger a re-render of the entire upload widget.
 */

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import _cloneDeep from 'lodash/cloneDeep'
import _isMatch from 'lodash/isEqual'
import ReactNotification, { store } from 'react-notifications-component'

import { formatFileFromServer, formatFileForApi, newStudyFileObj } from './upload-utils'
import { createStudyFile, updateStudyFile, deleteStudyFile, fetchStudyFileInfo, sendStudyFileChunk } from 'lib/scp-api'
import MessageModal from 'lib/MessageModal'
import UserProvider from 'providers/UserProvider'

import StepTabHeader from './StepTabHeader'
import ClusteringStep from './ClusteringStep'
import SpatialStep from './SpatialStep'
import ImageStep from './ImageStep'
import CoordinateLabelStep from './CoordinateLabelStep'
import RawCountsStep from './RawCountsStep'
import ProcessedExpressionStep from './ProcessedExpressionStep'
import MetadataStep from './MetadataStep'
import MiscellaneousStep from './MiscellaneousStep'
import SequenceFileStep from './SequenceFileStep'
import GeneListStep from './GeneListStep'
import LoadingSpinner from 'lib/LoadingSpinner'

const CHUNK_SIZE = 10000000
const STEPS = [
  RawCountsStep,
  ProcessedExpressionStep,
  MetadataStep,
  ClusteringStep,
  SpatialStep,
  CoordinateLabelStep,
  ImageStep,
  SequenceFileStep,
  GeneListStep,
  MiscellaneousStep
]

const SUCCESS_NOTIFICATION_TEMPLATE = {
  type: 'success',
  insert: 'top',
  container: 'top-right',
  width: 425,
  dismiss: {
    duration: 3000,
    showIcon: false
  }
}

const FAILURE_NOTIFICATION_TEMPLATE = {
  ...SUCCESS_NOTIFICATION_TEMPLATE,
  type: 'danger',
  dismiss: {
    duration: 0,
    showIcon: true
  }
}

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
  function handleSaveResponse(response, oldFileId, uploadingMoreChunks) {
    const updatedFile = formatFileFromServer(response)
    // first update the serverState
    setServerState(prevServerState => {
      const newServerState = _cloneDeep(prevServerState)
      let fileIndex = newServerState.files.findIndex(f => f.name === updatedFile.name)
      if (fileIndex < 0) {
        // this is a new file -- add it to the end of the list
        fileIndex = newServerState.files.length
      }
      newServerState.files[fileIndex] = updatedFile
      return newServerState
    })
    // then update the form state
    setFormState(prevFormState => {
      const newFormState = _cloneDeep(prevFormState)
      const fileIndex = newFormState.files.findIndex(f => f._id === oldFileId)
      const formFile = _cloneDeep(updatedFile)
      if (uploadingMoreChunks) {
        // copy over the previous files saving states
        formFile.isSaving = true
        formFile.saveProgress = newFormState.files[fileIndex].saveProgress
      }
      if (oldFileId != updatedFile._id) { // we saved a new file and got back a fresh id
        formFile.oldId = oldFileId
      }
      newFormState.files[fileIndex] = formFile
      return newFormState
    })
    if (!uploadingMoreChunks) {
      store.addNotification({
        ...SUCCESS_NOTIFICATION_TEMPLATE,
        title: `Save success`,
        message: updatedFile.name
      })
    }
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
      if (updates.expression_file_info) {
        // merge expression file info properties
        Object.assign(fileChanged.expression_file_info, updates.expression_file_info)
        delete updates.expression_file_info
      }
      Object.assign(fileChanged, updates)
      return newFormState
    })
  }

  /** handler for progress events from an XMLHttpRequest call.
   *    Updates the overall save progress of the file
   */
  function handleSaveProgress(progressEvent, fileId, fileSize, chunkStart) {
    if (!fileSize) {
      return // this is just a field update with no upload, so no need to show progress
    }
    // the progress event sometimes reports more than the actual size sent
    // maybe because of some minimum buffer size?
    const amountSent = Math.min(CHUNK_SIZE, progressEvent.loaded)
    let overallCompletePercent = (chunkStart + amountSent) / fileSize * 100
    // max at 98, since the progress event comes based on what's sent.
    // we always still will need to wait for the server to respond after we get to 100
    overallCompletePercent = Math.round(Math.min(overallCompletePercent, 98))
    updateFile(fileId, { saveProgress: overallCompletePercent })
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
          studyAccession, studyFileData, isChunked, chunkStart, chunkEnd, fileSize,
          onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
        })
      } else {
        response = await updateStudyFile({
          studyAccession, studyFileId, studyFileData, isChunked, chunkStart, chunkEnd, fileSize,
          onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
        })
      }
      handleSaveResponse(response, studyFileId, isChunked)
      studyFileId = response._id
      if (isChunked) {
        while (chunkEnd < fileSize) {
          chunkStart += CHUNK_SIZE
          chunkEnd = Math.min(chunkEnd + CHUNK_SIZE, fileSize)
          const chunkApiData = formatFileForApi(file, chunkStart, chunkEnd)
          response = await sendStudyFileChunk({
            studyAccession, studyFileId, studyFileData: chunkApiData, chunkStart, chunkEnd, fileSize,
            onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
          })
        }
        handleSaveResponse(response, studyFileId, false)
      }
    } catch (error) {
      store.addNotification({
        ...FAILURE_NOTIFICATION_TEMPLATE,
        title: 'Save failed',
        message: <div>{file.name}<br/>{error}</div>,
      })
      updateFile(studyFileId, {
        isSaving: false
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
        store.addNotification({
          ...SUCCESS_NOTIFICATION_TEMPLATE,
          title: 'Delete succeeded',
          message: file.name
        })
      } catch (error) {
        store.addNotification({
          ...FAILURE_NOTIFICATION_TEMPLATE,
          title: 'Delete failed',
          message: <div>{file.name}<br/>{error}</div>
        })
        updateFile(file._id, {
          isDeleting: false
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

  return <UserProvider>
    <ReactNotification />
    <div className="upload-wizard-react">
      <div className="row">
        <div className="col-md-3">
          <div className="position-fixed">
            <div className="padded">
              <h5><a href={`/single_cell/study/${studyAccession}`}>{studyAccession}</a>: {name}</h5>
            </div>
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
        </div>
        <div className="col-md-9">
          { !formState && <LoadingSpinner data-testid="upload-wizard-spinner"/> }
          { !!formState && <currentStep.component
            formState={formState}
            serverState={serverState}
            deleteFile={deleteFile}
            updateFile={updateFile}
            saveFile={saveFile}
            addNewFile={addNewFile}
          /> }
        </div>
      </div>
      <MessageModal/>
    </div>
  </UserProvider>
}

/** convenience method for drawing/updating the component from non-react portions of SCP */
export function renderUploadWizard(target, studyAccession, name) {
  ReactDOM.render(
    <UploadWizard
      studyAccession={studyAccession}
      name={name}/>,
    target
  )
}
