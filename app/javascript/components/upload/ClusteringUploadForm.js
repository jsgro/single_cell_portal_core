import React, { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import UploadSteps from './UploadSteps'
import FileUploadControl from './FileUploadControl'

const DEFAULT_NEW_CLUSTER_FILE = {
  is_spatial: false,
  file_type: 'Cluster'
}

/** Renders a form for uploading one or more cluster/spatial files */
export default function ClusteringUploadForm({
  studyState,
  setStudyState,
  formState,
  setFormState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {

  const clusterFiles = formState.files.filter(UploadSteps.clustering.fileFilter)

  useEffect(() => {
    if (clusterFiles.length === 0) {
      addNewFile(DEFAULT_NEW_CLUSTER_FILE)
    }
  }, [clusterFiles.length])

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
        <a href="https://singlecell.zendesk.com/hc/en-us/articles/360060610032-Cluster-File-Subsampling" target="_blank" rel="noreferrer"> Learn More <i className='fas fa-question-circle'></i></a>
      </p>
    </div>
    <div className="row">
      <p className="col-sm-12"><a href="https://en.wikipedia.org/wiki/Spatial_transcriptomics" target="_blank" rel="noreferrer">Spatial transcriptomics</a> data can also be uploaded with this file format.  The x, y, and z coordinates then represent actual spatial coordinates, as opposed to clustering output.</p>
    </div>
    <div className="row">
      <p className="col-sm-12">* Group values are treated as literal strings, and numerics as floating-point numbers.</p>
    </div>
    { clusterFiles.map(file => {
      return <div className="row top-margin" key={file._id}>

        <div className="col-md-12">
          <form id={`clusterForm-${file._id}`}
            className="form-terra"
            acceptCharset="UTF-8">
            <FileUploadControl handleSaveResponse={handleSaveResponse} file={file} updateFile={updateFile}/>
            <div className="form-group">
              <label htmlFor={`clusterNameInput-${file._id}`}>Name</label>
              <input className="form-control"
                type="text"
                id={`clusterNameInput-${file._id}`}
                value={file.name}
                onChange={event => updateFile(file._id, { name: event.target.value })}/>
            </div>
            <div className="form-group">
              <label>Coordinate data type:</label><br/>
              <label className="sublabel">
                <input type="radio" name={`clusterFormSpatial-${file._id}`} value="false" checked={!file.is_spatial} onChange={e => updateFile(file._id, { is_spatial: false })} /> Clustering
              </label>
              <label className="sublabel">
                <input type="radio" name={`clusterFormSpatial-${file._id}`} value="true" checked={file.is_spatial} onChange={e => updateFile(file._id, { is_spatial: true })}/> Spatial transcriptomics positions
              </label>
            </div>
            <div className="form-group">
              <label htmlFor={`clusterDescriptionInput-${file._id}`}>Description</label>
              <input className="form-control"
                type="text"
                id={`clusterDescriptionInput-${file._id}`}
                value={file.description}
                onChange={event => updateFile(file._id, { description: event.target.value })}/>
            </div>

            <button type="button" className="btn btn-primary" disabled={!file.isDirty} onClick={() => saveFile(file)}>
              Save
              { file.submitData && <span> &amp; Upload</span> }
            </button> &nbsp;
            <button type="button" className="btn btn-danger cancel float-right" onClick={() => deleteFile(file)}>
              <i className="fas fa-trash"></i> Delete
            </button>
          </form>
          { file.isSaving &&
            <div className="saving-overlay">
              Saving <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/>
            </div>
          }
        </div>

      </div>
    })}
    <div className="row top-margin">
      <button className="btn btn-secondary action" onClick={() => addNewFile(DEFAULT_NEW_CLUSTER_FILE)}><span className="fas fa-plus"></span> Add File</button>
    </div>
  </div>
}
