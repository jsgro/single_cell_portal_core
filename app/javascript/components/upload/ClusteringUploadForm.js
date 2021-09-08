import React, { useEffect } from 'react'
import ReactDOMServer from 'react-dom/server'
import _cloneDeep from 'lodash/cloneDeep'

import UploadSteps from './UploadSteps'
import { bytesToSize } from 'lib/stats'
import { getAccessToken } from 'providers/UserProvider'

/** Renders a form for uploading one or more cluster/spatial files */
export default function ClusteringUploadForm({ studyState, setStudyState, formState, setFormState }) {

  const clusterFiles = formState.files.filter(UploadSteps.clustering.fileFilter)

  /** adds an empty file of the type */
  function addNewFile() {
    const newState = _cloneDeep(formState)
    newState.files.push({
      name: '',
      id: 'NEW',
      file_type: 'Cluster',
      status: 'new',
      parse_status: 'unparsed'
    })
    setFormState(newState)
  }

  /** Updates file fields by merging in the 'updates', does not perform any validation */
  function updateFile(fileId, updates) {
    const newFormState = _cloneDeep(formState)
    const fileChanged = newFormState.files.find(file => file.id === fileId)
    Object.assign(fileChanged, updates)
    setFormState(newFormState)
  }

  /** save the given file and perform an upload if present */
  function saveFile(file) {
    if (file.submitData) {
      file.submitData.submit()
    }
  }

  /** render the file upload/cancel buttons.  See https://github.com/blueimp/jQuery-File-Upload/wiki/Template-Engine */
  function renderUpload(fileUpload, file) {
    if (!fileUpload.files) {
      return ''
    }
    const uploadFile = fileUpload.files[0]
    const uploadTemplate = <div className="template-upload">
      {uploadFile.name} ({bytesToSize(uploadFile.size)})
    </div>
    return ReactDOMServer.renderToString(uploadTemplate)
  }


  useEffect(() => {
    if (clusterFiles.length === 0) {
      addNewFile()
    }
  }, [clusterFiles.length])

  useEffect(() => {
    clusterFiles.forEach(file => {
      let url = `/single_cell/api/v1/studies/${studyState.study.id}/study_files/${file.id}`
      if (file.status === 'new') {
        url = `/single_cell/api/v1/studies/${studyState.study.id}/study_files`
      }
      $(`#clusterFileInput-${file.id}`).fileupload({
        url,
        maxChunkSize: 10000000,
        type: file.status === 'new' ? 'POST' : 'PATCH',
        formData: () => formatForApi(studyState.study.id, file),
        add: (e, data) => {
          updateFile(file.id, {
            submitData: data,
            name: file.name ? file.name : data.files[0].name
          })
          const widgetId = `#clusterFileInput-${file.id}`
          $.blueimp.fileupload.prototype.options.add.call(widgetId, e, data)
        },
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        acceptFileTypes: window.ALLOWED_FILE_TYPES['plainText'],
        filesContainer: `#clusterFileList-${file.id}`,
        uploadTemplateId: null,
        uploadTemplate: uploadObj => renderUpload(uploadObj, file),
        downloadTemplateId: null,
        downloadTemplate: () => renderUpload(file),
        done: () => {
          alert('WOOOOOO!!!!')
        }
      })
    })
  })

  return <div>
    <h4>Clustering files</h4>
    { clusterFiles.map(file => {
      return <div className="row top-margin" key={file.id}>

        <div className="col-md-12">
          <form id={`clusterForm-${file.id}`}
            className="form-terra"
            acceptCharset="UTF-8">
            <div className="form-group">
              <label>File{ file.status !== 'new' && <span>: {file.upload_file_name}</span> }</label>
              <br/>
              <button className="fileinput-button btn btn-secondary" id={`clusterFileButton-${file.id}`}>
                { file.upload_file_name ? 'Change file' : 'Choose file' }
                <input className="file-upload" type="file" name="study_file[upload]" id={`clusterFileInput-${file.id}`}/>
              </button>
              <div className="file-container" id={`clusterFileList-${file.id}`}></div>
            </div>
            <div className="form-group">
              <label htmlFor={`clusterNameInput-${file.id}`}>Name</label>
              <input className="form-control"
                type="text"
                id={`clusterNameInput-${file.id}`}
                value={file.name}
                onChange={event => updateFile(file.id, {name: event.target.value})}/>
            </div>

            <button type="button" className="btn btn-primary" disabled={!file.isDirty} onClick={() => saveFile(file)}>
              Save
              { file.submitData && <span> &amp; Upload</span> }
            </button> &nbsp;
            <button type="button" className="btn btn-secondary cancel" disabled={!file.isDirty}>
              <i className="fas fa-undo"></i> Reset
            </button>
          </form>
        </div>

      </div>
    })}
    <div className="row top-margin">
      <button className="btn btn-secondary action" onClick={addNewFile}><span className="fas fa-plus"></span> Add File</button>
    </div>
  </div>
}

function formatForApi(studyId, file) {
  const valueHash = Object.assign({}, file, {
    study_id: studyId,
    _id: file.id
  })
  valueHash.submitData = undefined
  return Object.keys(valueHash).map(key => ({ name: `study_file[${key}]`, value: valueHash[key] }))
}
