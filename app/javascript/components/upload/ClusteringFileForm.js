import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select'

import FileUploadControl from './FileUploadControl'

/** renders a form for editing/uploading a single cluster file */
export default function ClusteringFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters
}) {


  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
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
        { file.is_spatial &&
          <div className="form-group">
            <label>Corresponding clusters:</label><br/>
            <Select options={associatedClusterFileOptions}
              value={spatialClusterAssocs}
              isMulti={true}
              placeholder="None"
              onChange={val => updateCorrespondingClusters(file, val)}/>
          </div>
        }
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
}
