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
import { Router, useLocation, navigate } from '@reach/router'
import * as queryString from 'query-string'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

import { formatFileFromServer, formatFileForApi, newStudyFileObj } from './upload-utils'
import {
  createStudyFile, updateStudyFile, deleteStudyFile,
  fetchStudyFileInfo, sendStudyFileChunk, RequestCanceller
} from 'lib/scp-api'
import MessageModal, { successNotification, failureNotification } from 'lib/MessageModal'
import UserProvider from 'providers/UserProvider'
import ErrorBoundary from 'lib/ErrorBoundary'

import WizardNavPanel from './WizardNavPanel'
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
  SequenceFileStep,
  GeneListStep,
  MiscellaneousStep
]

const MAIN_STEPS = STEPS.slice(0, 4)
const SUPPLEMENTAL_STEPS = STEPS.slice(4)


/** shows the upload wizard */
export function RawUploadWizard({ studyAccession, name }) {
  const [serverState, setServerState] = useState(null)
  const [formState, setFormState] = useState(null)

  const allowReferenceImageUpload = serverState?.feature_flags?.reference_image_upload

  if (allowReferenceImageUpload && !STEPS.includes(ImageStep)) {
    STEPS.splice(5, 0, ImageStep)
    SUPPLEMENTAL_STEPS.splice(1, 0, ImageStep)
  }

  const routerLocation = useLocation()
  const queryParams = queryString.parse(routerLocation.search)
  let currentStepIndex = STEPS.findIndex(step => step.name === queryParams.tab)
  if (currentStepIndex < 0) {
    currentStepIndex = 0
  }
  const currentStep = STEPS[currentStepIndex]


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

  /** move the wizard to the given step tab */
  function setCurrentStep(newStep) {
    navigate(`?tab=${newStep.name}`)
    window.scrollTo(0, 0)
  }

  /** adds an empty file, merging in the given fileProps. Does not communicate anything to the server
   * By default, will scroll the window to show the new file
   * */
  function addNewFile(fileProps, scrollToBottom=false) {
    const newFile = newStudyFileObj(serverState.study._id.$oid)
    Object.assign(newFile, fileProps)

    setFormState(prevFormState => {
      const newState = _cloneDeep(prevFormState)
      newState.files.push(newFile)
      return newState
    })
    if (scrollToBottom) {
      window.setTimeout(() => scroll({ top: document.body.scrollHeight, behavior: 'smooth' }), 100)
    }
  }

  /** handle response from server after an upload by updating the serverState with the updated file response */
  function handleSaveResponse(response, oldFileId, uploadingMoreChunks, requestCanceller) {
    if (requestCanceller.wasCancelled) {
      store.addNotification(failureNotification(`${updatedFile.name} save cancelled`))
      updateFile(oldFileId, { isSaving: false, requestCanceller: null })
      return
    }
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
        const oldFormFile = newFormState.files[fileIndex]
        formFile.isSaving = true
        formFile.saveProgress = oldFormFile.saveProgress
        formFile.cancelUpload = oldFormFile.cancelUpload
      }
      if (oldFileId != updatedFile._id) { // we saved a new file and got back a fresh id
        formFile.oldId = oldFileId
      }
      newFormState.files[fileIndex] = formFile
      return newFormState
    })
    if (!uploadingMoreChunks) {
      store.addNotification(successNotification(`${updatedFile.name} saved successfully`))
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

  /** cancels the pending upload and deletes the file */
  async function cancelUpload(requestCanceller) {
    requestCanceller.cancel()
    const fileId = requestCanceller.fileId

    deleteFileFromForm(fileId)
    // wait a brief amount of time to minimize the timing edge case where the user hits 'cancel' while the request
    // completed.  In that case the file will have been saved, but we won't have the new id yet.  We need to wait until
    // the id comes back so we can address the delete request properly
    // We also don't await the delete since if it errors, it is likely because the file never got created or
    // got deleted for other reasons (e.g. invalid form data) in the meantime
    setTimeout(() => deleteFileFromServer(requestCanceller.fileId), 500)
  }

  /** save the given file and perform an upload if a selected file is present */
  async function saveFile(file) {
    let studyFileId = file._id

    const fileSize = file.uploadSelection?.size
    const isChunked = fileSize > CHUNK_SIZE
    let chunkStart = 0
    let chunkEnd = Math.min(CHUNK_SIZE, fileSize)

    const studyFileData = formatFileForApi(file, chunkStart, chunkEnd)
    try {
      let response
      const requestCanceller = new RequestCanceller(studyFileId)
      if (fileSize) {
        updateFile(studyFileId, { isSaving: true, cancelUpload: () => cancelUpload(requestCanceller) })
      } else {
        // if there isn't an associated file upload, don't allow the user to cancel the request
        updateFile(studyFileId, { isSaving: true })
      }

      if (file.status === 'new') {
        response = await createStudyFile({
          studyAccession, studyFileData, isChunked, chunkStart, chunkEnd, fileSize, requestCanceller,
          onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
        })
      } else {
        response = await updateStudyFile({
          studyAccession, studyFileId, studyFileData, isChunked, chunkStart, chunkEnd, fileSize, requestCanceller,
          onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
        })
      }
      handleSaveResponse(response, studyFileId, isChunked, requestCanceller)
      // copy over the new id from the server
      studyFileId = response._id
      requestCanceller.fileId = studyFileId
      if (isChunked && !requestCanceller.wasCancelled) {
        while (chunkEnd < fileSize && !requestCanceller.wasCancelled) {
          chunkStart += CHUNK_SIZE
          chunkEnd = Math.min(chunkEnd + CHUNK_SIZE, fileSize)
          const chunkApiData = formatFileForApi(file, chunkStart, chunkEnd)
          response = await sendStudyFileChunk({
            studyAccession, studyFileId, studyFileData: chunkApiData, chunkStart, chunkEnd, fileSize, requestCanceller,
            onProgress: e => handleSaveProgress(e, studyFileId, fileSize, chunkStart)
          })
        }
        handleSaveResponse(response, studyFileId, false, requestCanceller)
      }
    } catch (error) {
      store.addNotification(failureNotification(<span>{file.name} failed to save<br/>{error}</span>))
      updateFile(studyFileId, {
        isSaving: false
      })
    }
  }

  /** delete the file from the form, and also the server if it exists there */
  async function deleteFile(file) {
    const fileId = file._id
    if (file.status === 'new') {
      deleteFileFromForm(fileId)
    } else {
      updateFile(fileId, { isDeleting: true })
      try {
        await deleteFileFromServer(fileId)
        deleteFileFromForm(fileId)
        store.addNotification(successNotification(`${file.name} deleted successfully`))
      } catch (error) {
        store.addNotification(failureNotification(<span>{file.name} failed to delete<br/>{error.message}</span>))
        updateFile(fileId, {
          isDeleting: false
        })
      }
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

  /** deletes the file from the server */
  async function deleteFileFromServer(fileId) {
    await deleteStudyFile(studyAccession, fileId)
    setServerState(prevServerState => {
      const newServerState = _cloneDeep(prevServerState)
      newServerState.files = newServerState.files.filter(f => f._id !== fileId)
      return newServerState
    })
  }

  // on initial load, load all the details of the study and study files
  useEffect(() => {
    fetchStudyFileInfo(studyAccession).then(response => {
      response.files.forEach(file => formatFileFromServer(file))
      setServerState(response)
      setFormState(_cloneDeep(response))
    })
  }, [studyAccession])

  const nextStep = STEPS[currentStepIndex + 1]
  const prevStep = STEPS[currentStepIndex - 1]
  return <div className="upload-wizard-react">
    <div className="row">
      <div className="col-md-12 wizard-top-bar">
        <span>{serverState?.study?.name}</span> / &nbsp;
        <a href={`/single_cell/study/${studyAccession}`}>View study</a>
      </div>
    </div>
    <div className="row wizard-content">
      <div className="col-md-3">
        <WizardNavPanel {...{
          formState, serverState, currentStep, setCurrentStep, studyAccession, mainSteps: MAIN_STEPS,
          supplementalSteps: SUPPLEMENTAL_STEPS, studyName: name
        }} />
      </div>
      <div className="col-md-9">
        <div className="flexbox-align-center top-margin">
          <h4>{currentStep.header}</h4>
          <div className="prev-next-buttons">
            { prevStep && <button
              className="btn terra-tertiary-btn margin-right"
              onClick={() => setCurrentStep(prevStep)}>
              <FontAwesomeIcon icon={faChevronLeft}/> Previous
            </button> }
            { nextStep && <button
              className="btn terra-tertiary-btn"
              onClick={() => setCurrentStep(nextStep)}>
              Next <FontAwesomeIcon icon={faChevronRight}/>
            </button> }
          </div>
        </div>
        { !formState && <div className="padded text-center">
          <LoadingSpinner data-testid="upload-wizard-spinner"/>
        </div> }
        { !!formState && <div>
          <currentStep.component
            setCurrentStep={setCurrentStep}
            formState={formState}
            serverState={serverState}
            deleteFile={deleteFile}
            updateFile={updateFile}
            saveFile={saveFile}
            addNewFile={addNewFile}
          />
        </div> }
      </div>
    </div>
    <MessageModal/>
  </div>
}

/** Wraps the upload wirzard logic in a router and error handler */
export default function UploadWizard({ studyAccession, name }) {
  return <ErrorBoundary>
    <UserProvider>
      <ReactNotification />
      <Router>
        <RawUploadWizard studyAccession={studyAccession} name={name} default/>
      </Router>
    </UserProvider>
  </ErrorBoundary>
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
