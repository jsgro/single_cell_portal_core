import React, { useEffect } from 'react'
import ReactDOMServer from 'react-dom/server'
import _cloneDeep from 'lodash/cloneDeep'
import _uniqueId from 'lodash/uniqueId'

import UploadSteps from './UploadSteps'
import { bytesToSize } from 'lib/stats'
import { updateStudyFile, deleteStudyFile } from 'lib/scp-api'
import { getAccessToken } from 'providers/UserProvider'

/** Renders a form for uploading one or more cluster/spatial files */
export default function ClusteringUploadForm({ studyState, setStudyState, formState, setFormState }) {

  const clusterFiles = formState.files.filter(UploadSteps.clustering.fileFilter)

  /** adds an empty file of the type */
  function addNewFile() {
    const newState = _cloneDeep(formState)
    newState.files.push({
      name: '',
      id: _uniqueId('newClusterFile-'),
      file_type: 'Cluster',
      is_spatial: false,
      status: 'new',
      description: '',
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
    } else {
      let fileApiData = formatForApi(studyState.study.id, file)
      updateStudyFile(studyState.study.id, fileApiData).then(response => {
        // const newStudyState = _cloneDeep(studyState)
        // const fileChanged = newStudyState.files.find(f => file.id === f.Id)
        // Object.assign(fileChanged, response)
      })
    }
  }

  /** save the given file and perform an upload if present */
  function deleteFile(file) {
    if (file.status === 'new') {
      const newFormState = _cloneDeep(formState)
      newFormState.files = newFormState.files.filter(f => f.id != file.id)
      setFormState(newFormState)
    } else {
      deleteStudyFile(studyState.study.id, file.id)
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
        formData: () => formatForBlueImp(studyState.study.id, file),
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
    <div className="row">
      <h4 className="col-sm-12">4. Cluster / Spatial Files</h4>
      <p className="text-center"><a href="https://github.com/broadinstitute/single_cell_portal/blob/master/demo_data/cluster_example.txt" target="_blank" rel="noreferrer">Cluster File</a></p>
    </div>
    <div className="row">
      <pre className="code-example col-sm-5 col-sm-offset-4">NAME&#09;X&#09;Y&#09;Z&#09;Category&#09;Intensity<br/>TYPE&#09;numeric&#09;numeric&#09;numeric&#09;group&#09;numeric<br/>CELL_0001&#09;34.472&#09;32.211&#09;60.035&#09;C&#09;0.719<br/>CELL_0002&#09;15.975&#09;10.043&#09;21.424&#09;B&#09;.904<br/>...</pre>
    </div>
    <div className="row">
      <p className="col-sm-12 text-center">A <a href="https://github.com/broadinstitute/single_cell_portal/blob/master/demo_data/cluster_example.txt" target="_blank" rel="noreferrer">cluster file</a> (.txt or .txt.gz) contains any cluster ordinations and optional cluster-specific metadata.  <strong>At minimum </strong> a cluster file has:</p>
    </div>
    <div className="row">
      <div className="col-md-9 col-lg-offset-2 col-md-offset-1">
        <ul>
          <li>3 columns</li>
          <li>A header row containing the value <strong>“NAME”, “X”, “Y”,</strong> optionally <strong>“Z”</strong>, and columns containing cell-level annotations
          </li>
          <li>A second row with:</li>
          <ul >
            <li>The header of <strong>“TYPE”</strong>to declare metadata types (see below).</li>
            <li>A value for each metadata column declaring its datatype
            </li>
            <ul>
              <li>The two accepted values are <strong>“group”</strong> (set membership) or <strong>“numeric”</strong> (continuous scores).*</li>
              <li>The values for the “X”, “Y”, and “Z” columns must be set to “numeric”.</li>
            </ul>
          </ul>
        </ul>
      </div>
    </div>
    <div className="row">
      <p className="col-sm-12 text-center">Once your cluster file has been successfully ingested, additional representative
        subsamples of the full resolution data will be stored as well.
        <a href="https://singlecell.zendesk.com/hc/en-us/articles/360060610032-Cluster-File-Subsampling" target="_blank" rel="noreferrer">Learn More <i className='fas fa-question-circle'></i></a>
      </p>
    </div>
    <div className="row">
      <p className="col-sm-12"><a href="https://en.wikipedia.org/wiki/Spatial_transcriptomics" target="_blank" rel="noreferrer">Spatial transcriptomics</a> data can also be uploaded with this file format.  The x, y, and z coordinates then represent actual spatial coordinates, as opposed to clustering output.</p>
    </div>
    <div className="row">
      <p className="col-sm-12">* Group values are treated as literal strings, and numerics as floating-point numbers.</p>
    </div>
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
                onChange={event => updateFile(file.id, { name: event.target.value })}/>
            </div>
            <div className="form-group">
              <label>Coordinate data type:</label><br/>
              <label className="sublabel">
                <input type="radio" name={`clusterFormSpatial-${file.id}`} value="false" checked={!file.is_spatial} onChange={e => updateFile(file.id, { is_spatial: false })} /> Clustering
              </label>
              <label className="sublabel">
                <input type="radio" name={`clusterFormSpatial-${file.id}`} value="true" checked={file.is_spatial} onChange={e => updateFile(file.id, { is_spatial: true })}/> Spatial transcriptomics positions
              </label>
            </div>
            <div className="form-group">
              <label htmlFor={`clusterDescriptionInput-${file.id}`}>Description</label>
              <input className="form-control"
                type="text"
                id={`clusterDescriptionInput-${file.id}`}
                value={file.description}
                onChange={event => updateFile(file.id, { description: event.target.value })}/>
            </div>

            <button type="button" className="btn btn-primary" disabled={!file.isDirty} onClick={() => saveFile(file)}>
              Save
              { file.submitData && <span> &amp; Upload</span> }
            </button> &nbsp;
            <button type="button" className="btn btn-secondary cancel" disabled={!file.isDirty}>
              <i className="fas fa-undo"></i> Reset
            </button>
            <button type="button" className="btn btn-danger cancel float-right" onClick={() => deleteFile(file)}>
              <i className="fas fa-trash"></i> Delete
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

/** convert a file object into a hash that the api endpoint expects */
function formatForApi(studyId, file) {
  const valueHash = Object.assign({}, file, {
    study_id: studyId,
    _id: file.id
  })
  valueHash.submitData = undefined
  return valueHash
}

/** convert a file object into a hash that the api endpoint expects */
function formatForBlueImp(studyId, file) {
  const valueHash = Object.assign({}, file, {
    study_id: studyId,
    _id: file.id
  })
  valueHash.submitData = undefined
  return Object.keys(valueHash).map(key => ({ name: `study_file[${key}]`, value: valueHash[key] }))
}
