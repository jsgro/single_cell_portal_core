import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'

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
    file.taxon_id = file.taxon_id.$oid
  }
  if (!file.expression_file_info) {
    file.expression_file_info = {}
  }
  return file
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
        { file.isSaving ? 'Saving' : 'Deleting' } <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/>
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
export function SaveDeleteButtons({ file, updateFile, saveFile, deleteFile }) {
  return <div>
    <button type="button" className="btn btn-primary" disabled={!file.isDirty} onClick={() => saveFile(file)}>
      Save
      { file.uploadSelection && <span> &amp; Upload</span> }
    </button> &nbsp;
    <button type="button" className="btn btn-secondary float-right" onClick={() => deleteFile(file)}>
      <i className="fas fa-trash"></i> Delete
    </button>
  </div>
}

