import _uniqueId from 'lodash/uniqueId'
import _get from 'lodash/get'

/** properties used to track file state on the form, but that should not be sent to the server
 *  this also includes properties that are only modifiable on the server (and so should also
 * be ignored server side, but for best hygiene are also just not sent ) */
const PROPERTIES_NOT_TO_SEND = [
  'selectedFile',
  'uploadSelection',
  'submitData',
  'saveProgress',
  'isDirty',
  'isSaving',
  'isDeleting',
  'isError',
  'oldId',
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
  if (file.genome_assembly_id) {
    file.genome_assembly_id = file.genome_assembly_id.$oid
  }
  if (!file.expression_file_info) {
    file.expression_file_info = {}
  } else {
    delete file.expression_file_info._id
  }
  if (!file.expression_file_info.raw_counts_associations) {
    file.expression_file_info.raw_counts_associations = []
  }
  return file
}

/** find the bundle children of 'file', if any, in the given 'files' list */
export function findBundleChildren(file, files) {
  return files.filter(f => {
    const parentFields = [f.options?.matrix_id, f.options?.bam_id, f.options?.cluster_file_id]
    return parentFields.includes(file._id) || (file.oldId && parentFields.includes(file.oldId))
  })
}

/** return a new FormData based on the given file object, formatted as the api endpoint expects,
    cleaning out any excess params */
export function formatFileForApi(file, chunkStart, chunkEnd) {
  const data = new FormData()
  Object.keys(file).filter(key => !PROPERTIES_NOT_TO_SEND.includes(key)).forEach(key => {
    addObjectPropertyToForm(file, key, data)
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

/** Does basic validation of the file, including file existence, name, file type, and required fields
 * returns a hash of message keys to validation messages
 * allowedFileTypes is an array of string extensions, e.g. ['.txt', '.csv']
 * requiredFields is array objects with label and propertyName:  e.g. [{label: 'species', propertyName: 'taxon_id'}]
 * it validates the propertyName is specified (propertyName can include '.' for nested properties), and
 * uses the label in the validation message returned if the property is not specified. */
export function validateFile({ file, allFiles, allowedFileTypes=[], requiredFields=[] }) {
  if (!file) {
    // edge case where the form is rendered but hook to add an empty file has not yet finished
    return { file: 'File not yet initialized' }
  }

  const validationMessages = {}
  if (file.status === 'new') {
    if (!file.uploadSelection) {
      validationMessages.uploadSelection = 'You must select a file to upload'
    }
  }

  if (file.uploadSelection) {
    if (!allowedFileTypes.some(ext => file.uploadSelection.name.endsWith(ext))) {
      validationMessages.fileName = `Allowed extensions are ${allowedFileTypes.join(' ')}`
    }
  }

  validateNameUniqueness(file, allFiles, validationMessages)
  validateBundleParent(file, allFiles, validationMessages)
  validateRequiredFields(file, requiredFields, validationMessages)

  return validationMessages
}

/** checks required fields are present */
function validateRequiredFields(file, requiredFields, validationMessages) {
  requiredFields.forEach(field => {
    if (!_get(file, field.propertyName)) {
      validationMessages[field.propertyName] = `You must specify ${field.label}`
    }
  })
}

/** checks that a bundle parent is already saved */
function validateBundleParent(file, allFiles, validationMessages) {
  const parentId = file.options?.matrix_id || file.options?.bam_id || file.options?.cluster_file_id
  if (parentId) {
    // don't allow saving until parent file is saved and a real id is returned from the server
    const parentSaved = parent.status != 'new' && !parentId.includes('newFile')
    if (!parentSaved) {
      validationMessages['parentSaved'] = 'Parent file must be saved first'
    }
  }
}

/** checks that the files name is unique, and that the filename selected to be uploaded
 *  is unique across all files, both saved and unsaved */
function validateNameUniqueness(file, allFiles, validationMessages) {
  const allOtherFiles = allFiles.filter(f => f._id != file._id)
  const allOtherNames = allOtherFiles.map(f => f.name)
  const allOtherUploadFileNames = allOtherFiles.map(f => f.upload_file_name)
  const allOtherSelectedFileNames = allOtherFiles.map(f => f.uploadSelection?.name)
  if (file.uploadSelection) {
    if (allOtherNames.includes(file.uploadSelection.name) ||
      allOtherUploadFileNames.includes(file.uploadSelection.name) ||
      allOtherSelectedFileNames.includes(file.uploadSelection.name)) {
      validationMessages.fileName = `A file named ${file.uploadSelection.name} already exists in your study`
    }
  }
  if (allOtherNames.includes(file.name)) {
    validationMessages.fileName = `A file named ${file.name} already exists in your study`
  }
}

/** Because we are sending as FormData, rather than JSON, we need to split
    arrays and nested objects across multiple entries to deliver what Rails expects.
    The function below is informed by concepts from
    https://stackoverflow.com/questions/22783108/convert-js-object-to-form-data
    */
export function addObjectPropertyToForm(obj, propertyName, formData, nested) {
  let propString = `study_file[${propertyName}]`
  if (nested) {
    propString = `study_file[${nested}_attributes][${propertyName}]`
  }
  if (Array.isArray(obj[propertyName])) {
    if (obj[propertyName].length == 0) {
      // if the array is empty, send an empty string as an indication that it is cleared
      formData.append(`${propString}[]`, '')
    } else {
      // add each array entry as a separate form data entry
      obj[propertyName].forEach(val => {
        formData.append(`${propString}[]`, val)
      })
    }
  } else if (obj[propertyName] && typeof obj[propertyName] === 'object') {
    // iterate over the keys and add each as a nested form property
    Object.keys(obj[propertyName]).forEach(subKey => {
      addObjectPropertyToForm(obj[propertyName], subKey, formData, propertyName)
    })
  } else {
    // don't set null properties -- those are ones that haven't changed
    // and having them be sent as 'null' or '' can throw off validations
    if (obj[propertyName] != null) {
      formData.append(propString, obj[propertyName])
    }
  }
}


