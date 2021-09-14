import React from 'react'
import Select from 'react-select'

import FileUploadControl from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'

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
        <FileUploadControl
          handleSaveResponse={handleSaveResponse}
          file={file}
          updateFile={updateFile}
          allowedFileTypes={window.ALLOWED_FILE_TYPES['plainText']}/>
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
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
          <TextFormField label="Description / Figure Legend (this will be displayed below cluster)" fieldName="description" file={file} updateFile={updateFile}/>
        </div>
        <div className="row">
          <div className="col-md-4">
            <TextFormField label="X Axis Label" fieldName="x_axis_label" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-4">
            <TextFormField label="Y Axis Label" fieldName="y_axis_label" file={file} updateFile={updateFile}/>
          </div>
        </div>
        <div className="row">
          <div className="col-md-2">
            <TextFormField label="X Domain Min" fieldName="x_axis_min" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="X Domain Max" fieldName="x_axis_max" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="Y Domain Min" fieldName="z_axis_min" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="Y Domain Max" fieldName="z_axis_max" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="Z Domain Min" fieldName="z_axis_min" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="Z Domain Max" fieldName="z_axis_max" file={file} updateFile={updateFile}/>
          </div>
        </div>
        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
      </form>
      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>

  </div>
}
