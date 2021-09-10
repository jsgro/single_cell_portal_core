import React from 'react'

/** properties used to track file state on the form, but that should not be sent to the server
 *  this also includes properties that are only modifiable on the server (and so should also
 * be ignored server side, but for best hygiene are also just not sent ) */
const PROPERTIES_NOT_TO_SEND = [
  'selectedFile',
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

/** return a new hash based on the given file object, formatted as the api endpoint expects,
    cleaning out any excess params */
export function formatFileForApi(file) {
  const cleanFile = {...file}
  PROPERTIES_NOT_TO_SEND.forEach(prop => delete cleanFile[prop])
  return cleanFile
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
