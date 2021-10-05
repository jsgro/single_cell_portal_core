import React from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'


/** renders a form for editing/uploading a single cluster file */
export default function ClusteringFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters,
  bucketName
}) {
  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <FileUploadControl
          handleSaveResponse={handleSaveResponse}
          file={file}
          updateFile={updateFile}
          allowedFileTypes={FileTypeExtensions.plainText}
          bucketName={bucketName}/>
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
        { file.is_spatial &&
          <div className="form-group">
            <label className="labeled-select">Corresponding clusters
              <Select options={associatedClusterFileOptions}
                data-analytics-name="spatial-associated-clusters"
                value={spatialClusterAssocs}
                isMulti={true}
                placeholder="None"
                onChange={val => updateCorrespondingClusters(file, val)}/>
            </label>
          </div>
        }
        <TextFormField label="Description / Figure Legend (this will be displayed below cluster)" fieldName="description" file={file} updateFile={updateFile}/>

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
            <TextFormField label="Y Domain Min" fieldName="y_axis_min" file={file} updateFile={updateFile}/>
          </div>
          <div className="col-md-2">
            <TextFormField label="Y Domain Max" fieldName="y_axis_max" file={file} updateFile={updateFile}/>
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
