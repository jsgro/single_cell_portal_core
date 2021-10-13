import React from 'react'


import Select from 'lib/InstrumentedSelect'
import { FileTypeExtensions } from './FileUploadControl'
import { TextFormField } from './form-components'
import ExpandableFileForm from './ExpandableFileForm'
import { validateFile } from './upload-utils'

const allowedFileExts = FileTypeExtensions.plainText
const requiredFields = [{ label: 'Name', propertyName: 'name' }]

/** renders a form for editing/uploading a single cluster file */
export default function ClusteringFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  associatedClusterFileOptions,
  updateCorrespondingClusters,
  bucketName,
  initiallyExpanded
}) {
  const spatialClusterAssocs = file.spatial_cluster_associations
    .map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  const validationMessages = validateFile({
    file, allFiles, allowedFileExts, requiredFields
  })

  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, initiallyExpanded
  }}>
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
    <TextFormField label="Description / Figure Legend (this will be displayed below cluster)"
      fieldName="description" file={file} updateFile={updateFile}/>

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
  </ExpandableFileForm>
}
