import React from 'react'

import { FileTypeExtensions } from './upload-utils'
import { TextFormField } from './form-components'
import { validateFile } from './upload-utils'
import ExpandableFileForm from './ExpandableFileForm'

const allowedFileExts = FileTypeExtensions.plainText

/** renders a form for editing/uploading a miscellaneous file */
export default function GeneListFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  miscFileTypes,
  bucketName,
  isInitiallyExpanded
}) {
  const validationMessages = validateFile({ file, allFiles, allowedFileExts })
  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
    <TextFormField label="Description (shown above heatmap)" fieldName="description" file={file} updateFile={updateFile}/>
    <TextFormField label="Computed value name (legend label)" fieldName="y_axis_label" file={file} updateFile={updateFile}/>
    <div className="form-group">
      <label>Heatmap color scheme</label><br/>
      <label className="sublabel">
        <input type="radio"
          name={`heatmapAbsoluteFalse-${file._id}`}
          value={false}
          checked={!file.heatmap_absolute_scaling}
          onChange={e => updateFile(file._id, { heatmap_absolute_scaling: false })} /> Relative (e.g. gene expression heatmaps)
      </label>
      <label className="sublabel">
        <input type="radio"
          name={`heatmapAbsoluteTrue-${file._id}`}
          value={true}
          checked={file.heatmap_absolute_scaling}
          onChange={e => updateFile(file._id, { heatmap_absolute_scaling: true })} /> Actual value (e.g. correlation matrices)
      </label>
    </div>
    <span>SCALING: '{file.heatmap_absolute_scaling}'</span>
  </ExpandableFileForm>
}
