import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

/** properties used to track file state on the form, but that should not be sent to the server
 *  this also includes properties that are only modifiable on the server (and so should also
 * be ignored server side, but for best hygiene are also just not sent ) */
const PROPERTIES_NOT_TO_SEND = [
  'selectedFile',
  'uploadSelection',
  'submitData',
  'isDirty',
  'isSaving',
  'generation',
  'created_at',
  'updated_at',
  'queued_for_deletion',
  'data_dir',
  'options',
  'version',
  'status',
  'upload',
  'parse_status'
]

/** reworks the file object to make it easier to work with
  * maps the id property to _id, and sets undefined properties
  * this modifies the object in-place, but also returns it for easy chaining
  */
export function formatFileFromServer(file) {
  file._id = file._id.$oid
  file.description = file.description ? file.description : ''
  file.study_id = file.study_id.$oid
  return file
}

/** return a new FormData based on the given file object, formatted as the api endpoint expects,
    cleaning out any excess params */
export function formatFileForApi(file) {
  const data = new FormData()
  Object.keys(file).filter(key => !PROPERTIES_NOT_TO_SEND.includes(key)).forEach(key => {
    data.append(`study_file[${key}]`, file[key])
  })
  if (file.uploadSelection) {
    data.append('study_file[upload]', file.uploadSelection)
  }
  return data
}

/** renders a basic label->value text field in a bootstrap form control */
export function TextFormField({ label, fieldName, file, updateFile }) {
  return <div className="form-group">
    <label>{label}</label><br/>
    <input className="form-control"
      type="text"
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
  return <>
    { file.isSaving &&
      <div className="file-upload-overlay">
        Saving <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/>
      </div>
    }
    { file.isError &&
      <div className="file-upload-overlay ">
        <div className="error-message">
          An error occurred while saving the file<br/>
          { file.errorMessage }<br/><br/>
          <button className="btn btn-secondary" onClick={() => updateFile(file._id, { isError: false})}>Ok</button>
        </div>
      </div>
    }
  </>
}

