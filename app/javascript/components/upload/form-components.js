import React, { useState } from 'react'
import Modal from 'react-bootstrap/lib/Modal'

import LoadingSpinner from 'lib/LoadingSpinner'

/** renders a 'Add File' button that occupies a full row */
export function AddFileButton({ newFileTemplate, addNewFile }) {
  return <div className="row top-margin">
    <button className="btn btn-secondary action" onClick={() => addNewFile(newFileTemplate)}>
      <span className="fas fa-plus"></span> Add File
    </button>
  </div>
}

/** renders a basic label->value text field in a bootstrap form control */
export function TextFormField({ label, fieldName, file, updateFile }) {
  const fieldId = `${fieldName}-input-${file._id}`
  return <div className="form-group">
    <label htmlFor={fieldId}>{label}</label><br/>
    <input className="form-control"
      type="text"
      id={fieldId}
      value={file[fieldName] ? file[fieldName] : ''}
      onChange={event => {
        const update = {}
        update[fieldName] = event.target.value
        updateFile(file._id, update)
      }}/>
  </div>
}

/** renders an overlay if the file is saving, and also displays server error messages */
export function SavingOverlay({ file, updateFile }) {
  const showOverlay = file.isSaving || file.isDeleting || file.isError
  if (!showOverlay) {
    return <></>
  }
  return <div className="file-upload-overlay ">
    { (file.isSaving || file.isDeleting) &&
      <div className="file-upload-overlay">
        { file.isSaving ? 'Saving' : 'Deleting' } <LoadingSpinner/>
        <br/>
        { file.saveProgress &&
          <progress value={file.saveProgress} max="100">{file.saveProgress}%</progress>
        }
      </div>
    }
    { file.isError &&
      <div className="error-message">
        An error occurred:<br/>
        { file.errorMessage }<br/><br/>
        <button className="btn btn-secondary" onClick={() => updateFile(file._id, { isError: false })}>Ok</button>
      </div>
    }
  </div>
}

/** renders save and delete buttons for a given file */
export function SaveDeleteButtons({ file, updateFile, saveFile, deleteFile, saveEnabled=true, validationMessage }) {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)

  /** delete file with/without confirmation dialog as appropriate */
  function handleDeletePress() {
    if (file.status === 'new') {
      // it hasn't been uploaded yet, just delete it
      deleteFile(file)
    } else {
      setShowConfirmDeleteModal(true)
    }
  }

  return <div className="flexbox button-panel">
    <div data-role="tooltip" title={validationMessage ? validationMessage : 'Save'}>
      <button type="button" className="btn btn-primary margin-right" disabled={!file.isDirty || !saveEnabled} onClick={() => saveFile(file)}>
        Save
        { file.uploadSelection && <span> &amp; Upload</span> }
      </button>
    </div>
    <button type="button" className="btn btn-secondary" onClick={handleDeletePress}>
      <i className="fas fa-trash"></i> Delete
    </button>
    <Modal
      show={showConfirmDeleteModal}
      onHide={() => setShowConfirmDeleteModal(false)}
      animation={false}>
      <Modal.Body className="">
        Are you sure you want to delete { file.name }?<br/>
        <span>The file will be removed from the workspace and all corresponding database records deleted.</span>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-md btn-primary" onClick={() => {
          deleteFile(file)
          setShowConfirmDeleteModal(false)
        }}>Delete</button>
        <button className="btn btn-md btn-secondary" onClick={() => {
          setShowConfirmDeleteModal(false)
        }}>Cancel</button>
      </Modal.Footer>
    </Modal>
  </div>
}
