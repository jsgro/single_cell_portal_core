import React, { useState } from 'react'
import _uniqueId from 'lodash/uniqueId'
import Modal from 'react-bootstrap/lib/Modal'

import LoadingSpinner from 'lib/LoadingSpinner'

/** properties used to track file state on the form, but that should not be sent to the server
 *  this also includes properties that are only modifiable on the server (and so should also
 * be ignored server side, but for best hygiene are also just not sent ) */
const PROPERTIES_NOT_TO_SEND = [
  'selectedFile',
  'uploadSelection',
  'submitData',
  'isDirty',
  'isSaving',
  'isDeleting',
  'isError',
  'generation',
  'created_at',
  'updated_at',
  'queued_for_deletion',
  'upload_file_size',
  'data_dir',
  'options',
  'version',
  'status',
  'upload',
  'parse_status'
]

const ARRAY_PROPERTIES = [
  'spatial_cluster_associations'
]

/** gets an object representing a new, empty study file.  Does not communicate to server */
export function newStudyFileObj(studyId) {
  return {
    name: '',
    _id: _uniqueId('newFile-'), // we just need a temp id to give to form controls, the real id will come from the server
    status: 'new',
    description: '',
    parse_status: 'unparsed',
    spatial_cluster_associations: [],
    expression_file_info: {}
  }
}

/** reworks the file object to make it easier to work with
  * maps the id property to _id, and sets undefined properties
  * this modifies the object in-place, but also returns it for easy chaining
  */
export function formatFileFromServer(file) {
  file._id = file._id.$oid
  file.description = file.description ? file.description : ''
  delete file.study_id
  if (file.taxon_id) {
    // Note that taxon_id here is a MongoDB object ID, not an NCBI Taxonomy ID like "9606".
    file.taxon_id = file.taxon_id.$oid
  }
  if (!file.expression_file_info) {
    file.expression_file_info = {}
  }
  return file
}

/** find the bundle children of 'file', if any, in the given 'files' list */
export function findBundleChildren(file, files) {
  return files.filter(f => f.options?.matrix_file_name === file.name || f.options?.matrix_id === file._id)
}

/** return a new FormData based on the given file object, formatted as the api endpoint expects,
    cleaning out any excess params */
export function formatFileForApi(file, chunkStart, chunkEnd) {
  const data = new FormData()
  Object.keys(file).filter(key => !PROPERTIES_NOT_TO_SEND.includes(key)).forEach(key => {
    if (ARRAY_PROPERTIES.includes(key)) {
      // because we are sending as FormData, rather than JSON, we need to split
      // arrays across multiple entries to deliver what Rails expects.
      file[key].map(val => {
        data.append(`study_file[${key}][]`, val)
      })
    } else if (key === 'expression_file_info') {
      Object.keys(file.expression_file_info).forEach(expKey => {
        data.append(`study_file[expression_file_info_attributes][${expKey}]`, file.expression_file_info[expKey])
      })
    } else {
      data.append(`study_file[${key}]`, file[key])
    }
  })
  if (file.uploadSelection) {
    if (chunkStart || chunkEnd) {
      data.append('study_file[upload]', file.uploadSelection.slice(chunkStart, chunkEnd), file.name)
    } else {
      data.append('study_file[upload]', file.uploadSelection)
    }
    data.append('study_file[parse_on_upload]', true)
  }
  if (file.options) {
    Object.keys(file.options).forEach(key => {
      data.append(`study_file[options][${key}]`, file.options[key])
    })
  }
  return data
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

