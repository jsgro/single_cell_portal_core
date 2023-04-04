import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faTimes } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'
import { Popover, OverlayTrigger } from 'react-bootstrap'
import LoadingSpinner from '~/lib/LoadingSpinner'
import FileUploadControl from './FileUploadControl'

/** renders its children inside an expandable form with a header for file selection */
export default function ExpandableFileForm({
  file, allFiles, updateFile, allowedFileExts, validationMessages, bucketName,
  saveFile, deleteFile, isInitiallyExpanded, isAnnDataExperience, children
}) {
  const [expanded, setExpanded] = useState(isInitiallyExpanded || file.status === 'new')

  const isUploadEnabled = getIsUploadEnabled(isAnnDataExperience, allFiles, file)

  /** handle a click on the header bar (not the expand button itself) */
  function handleDivClick(e) {
    // if the panel is closed, and this didn't come from a link/button, toggle the header expansion
    if (!expanded && !e.target.closest('button') && !e.target.closest('a')) {
      handleExpansionClick()
    }
    // otherwise do nothing
  }

  /** handle a click on the toggle button itself */
  function handleExpansionClick() {
    setExpanded(!expanded)
  }
  let headerClass = 'flexbox-align-center upload-form-header'
  headerClass = expanded ? `${headerClass} expanded` : headerClass

  return <div className="row top-margin">
    <div className="col-md-12">
      <form id={`file-form-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className={headerClass} onClick={handleDivClick}>
          <div onClick={handleExpansionClick} className="expander">
            <button type="button" className="btn-icon" aria-label="expander">
              <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
            </button>
          </div>
          {isUploadEnabled && <div className="flexbox">
            <FileUploadControl
              file={file}
              allFiles={allFiles}
              updateFile={updateFile}
              allowedFileExts={allowedFileExts}
              validationMessages={validationMessages}
              bucketName={bucketName}
              isAnnDataExperience={isAnnDataExperience} />
          </div>}
          {getIsSaveEnabled(isAnnDataExperience, allFiles, file) && <SaveDeleteButtons {...{ file, updateFile, saveFile, deleteFile, validationMessages, isAnnDataExperience, allFiles }} /> }
        </div>
        {expanded && children}
        <SavingOverlay file={file} updateFile={updateFile} />
      </form>
    </div>
  </div>
}

/** renders an overlay if the file is saving, and also displays server error messages */
export function SavingOverlay({ file, updateFile }) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const showOverlay = file.isSaving || file.isDeleting
  if (!showOverlay) {
    return <></>
  }
  let cancelButtonContent = <></>
  if (file.cancelUpload) {
    cancelButtonContent = <>
      <button className="btn btn-md terra-secondary-btn upload-cancel-btn"
        data-testid="upload-cancel-btn"
        onClick={() => setShowCancelModal(true)}>
        Cancel
      </button>
      <Modal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        animation={false}>
        <Modal.Body className="">
          Cancel upload and delete file from the portal?
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-md btn-primary" data-testid="upload-cancel-yes-btn" onClick={() => {
            file.cancelUpload()
            setShowCancelModal(false)
          }}>Yes</button>
          <button className="btn btn-md terra-secondary-btn" onClick={() => {
            setShowCancelModal(false)
          }}>No</button>
        </Modal.Footer>
      </Modal>
    </>
  }
  return <div className="file-upload-overlay" data-testid="file-upload-overlay">
    {cancelButtonContent}
  </div>
}

/** renders save and delete buttons for a given file */
export function SaveDeleteButtons({ file, saveFile, deleteFile, validationMessages = {}, isAnnDataExperience, allFiles = [] }) {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const isExpressionMatrix = isAnnDataExperience && file.data_type === 'expression'
  // const annDataFile = allFiles.filter(f => f.file_type === 'AnnData')[0]
  // const [isNotFinalClustering, setIsNotFinalClustering] = useState(
  //   !isAnnDataExperience ? true : annDataFile?.ann_data_file_info?.data_fragments?.filter(f => f.data_type === 'cluster')?.length >= 1
  //   )
  
  // useEffect(() =>{
  //   if(!isAnnDataExperience){
  //     setIsNotFinalClustering(true)
  //   }else {
  //     setIsNotFinalClustering(isAnnDataExperience && annDataFile?.ann_data_file_info?.data_fragments?.filter(f => f.data_type === 'cluster')?.length > 1)

  //   }
  //   // console.log('jj:', annDataFile.ann_data_file_info.data_fragments.filter(f => f.data_type === 'cluster').length)
  // }, [allFiles])
  
  if (file.serverFile?.parse_status === 'failed') {
    return <div className="text-center">
      <div className="validation-error"><FontAwesomeIcon icon={faTimes}/> Parse failed</div>
      <div className="detail">Check your email for details - this file will be removed from the server.</div>
      <button className="terra-secondary-btn" onClick={() => deleteFile(file)}>OK</button>
    </div>
  }
  return <div className="flexbox-align-center button-panel">
    <SaveButton file={file} saveFile={saveFile} validationMessages={validationMessages} isAnnDataExperience={isAnnDataExperience}/>
    {!isExpressionMatrix && <DeleteButton file={file} deleteFile={deleteFile} setShowConfirmDeleteModal={setShowConfirmDeleteModal}/>}
    {/* {!isExpressionMatrix && !isNotFinalClustering && <DeleteButton file={file} deleteFile={deleteFile} setShowConfirmDeleteModal={setShowConfirmDeleteModal}/>} */}

    <Modal
      show={showConfirmDeleteModal}
      onHide={() => setShowConfirmDeleteModal(false)}
      animation={false}>
      <Modal.Body className="">
        Are you sure you want to delete {file.name}?<br />
        <span>The file will be removed from the workspace and all corresponding database records deleted.</span>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-md btn-primary" onClick={() => {
          deleteFile(file)
          setShowConfirmDeleteModal(false)
        }}>Delete</button>
        <button className="btn btn-md terra-secondary-btn" onClick={() => {
          setShowConfirmDeleteModal(false)
        }}>Cancel</button>
      </Modal.Footer>
    </Modal>
  </div>
}


/** renders a save button for a given file */
function SaveButton({ file, saveFile, validationMessages = {}, isAnnDataExperience }) {
  const saveDisabled = isAnnDataExperience ? false : Object.keys(validationMessages).length > 0
  let saveButton = <button
    style={{ pointerEvents: saveDisabled ? 'none' : 'auto' }}
    type="button"
    className={file.isDirty ? 'btn btn-primary margin-right' : 'btn terra-secondary-btn margin-right'}
    onClick={() => saveFile(file) }
    disabled={saveDisabled}
    data-testid="file-save">
    Save {file.uploadSelection && <span>&amp; Upload</span>}
  </button>

  if (saveDisabled) {
    // if saving is disabled, wrap the disabled button in a popover that will show the errors
    const validationPopup = <Popover id={`save-invalid-${file._id}`} className="tooltip-wide">
      {Object.keys(validationMessages).map(key => <div key={key}>{validationMessages[key]}</div>)}
    </Popover>
    saveButton = <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="left" overlay={validationPopup}>
      <div>{saveButton}</div>
    </OverlayTrigger>
  } else if (file.isSaving) {
    const savingText = file.saveProgress ? <span>Uploading {file.saveProgress}% </span> : 'Saving'
    saveButton = <button type="button"
      className="btn btn-primary margin-right">
      {savingText} <LoadingSpinner testId="file-save-spinner" />
    </button>
  }
  return saveButton
}

/** renders a delete button for a given file
 * will show a parsing indicator if the file is parsing (and therefore not deletable) */
function DeleteButton({ file, deleteFile, setShowConfirmDeleteModal }) {
  /** delete file with/without confirmation dialog as appropriate */
  function handleDeletePress() {
    if (file.status === 'new') {
      // it hasn't been uploaded yet, just delete it
      deleteFile(file)
    } else {
      setShowConfirmDeleteModal(true)
    }
  }

  let deleteButtonContent = 'Delete'
  if (file.isDeleting) {
    deleteButtonContent = <span>Deleting <LoadingSpinner testId="file-save-spinner" /></span>
  }
  let deleteButton = <button type="button" className="btn terra-secondary-btn" onClick={handleDeletePress} data-testid="file-delete">
    {deleteButtonContent}
  </button>
  if (file.serverFile?.parse_status === 'parsing') {
    deleteButton = <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="top" overlay={parsingPopup}>
      <span className="detail">Parsing <LoadingSpinner/></span>
    </OverlayTrigger>
  }
  return deleteButton
}

/**
 * Determine whether to show the file upload control buttons.
 * If the file form is for Clustering or Expression Matrix
 * while in AnnData experience mode do not display the buttons
 *
 * @param {boolean} isAnnDataExperience
 * @param {array} allFiles
 * @returns {boolean} Whether to show upload control buttons or not
 */
function getIsUploadEnabled(isAnnDataExperience, allFiles, file) {
  const alreadyUploaded = allFiles.forEach(fileObj => {
    if (fileObj?.ann_data_file_info?.has_clusters) {
      return true
    }
  })
  const isClustering = file.file_type === 'Cluster'
  const isExpressionMatrix = file.file_type === 'Expression Matrix'
  if (isClustering && alreadyUploaded && isAnnDataExperience) {return true}
  return !((isClustering || isExpressionMatrix) && isAnnDataExperience)
}

/**
 * Determine whether to show the save/delete buttons.
 *
 * @param {boolean} isAnnDataExperience
 * @param {array} allFiles
 * @returns {boolean} Whether to show upload control buttons or not
 */
function getIsSaveEnabled(isAnnDataExperience, allFiles, file) {
  // if it's not AnnDataExperience don't gate the save/delete buttons
  if (!isAnnDataExperience) {return true}

  // only allow save/delete for updates after an AnnData file has been uploaded
  let alreadyUploaded = false
  allFiles.forEach(fileObj => {
    if (fileObj?.ann_data_file_info?.data_fragments.length > 0) {
      alreadyUploaded = true
    }
  })

  // cluster files that haven't been saved have a file_type whereas once saved they are fragments which have a data_type
  const isClustering = file.data_type === 'cluster' || file.file_type === 'Cluster'
  const isAnnData = file.data_type === 'AnnData' || file.file_type === 'AnnData'
  const isExpressionMatrix = file.data_type === 'expression'

  if ((isClustering || isExpressionMatrix || isAnnData) && alreadyUploaded && isAnnDataExperience) {
    return true
  } else if (isAnnData && isAnnDataExperience) {
    return true
  } {
    return false
  }
}

const parsingPopup = <Popover id="parsing-tooltip" className="tooltip-wide">
  <div>This file is currently being parsed on the server.  <br/>
    You will receive an email when the parse is complete (typically within 5-30 minutes, depending on file size). <br/>
    You can continue to upload other files during this time. <br/>
    You cannot delete files while they are being parsed.
  </div>
</Popover>
