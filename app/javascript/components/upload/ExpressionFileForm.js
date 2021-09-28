import React from 'react'
import Select from 'react-select'

import MTXBundledFilesForm from './MTXBundledFilesForm'
import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'

/** renders a form for editing/uploading a single cluster file */
export default function ExpressionFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  addNewFile,
  handleSaveResponse,
  fileMenuOptions,
  associatedChildren
}) {

  const speciesOptions = fileMenuOptions.species.map(spec => ({ label: spec.common_name, value: spec.id }))
  const selectedSpecies = speciesOptions.find(opt => opt.value === file.taxon_id)
  const isMtxFile = file.file_type === 'MM Coordinate Matrix'

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
        acceptCharset="UTF-8">

        <FileUploadControl
          handleSaveResponse={handleSaveResponse}
          file={file}
          updateFile={updateFile}
          allowedFileTypes={isMtxFile ? FileTypeExtensions.mtx : FileTypeExtensions.plainText}/>
        <div className="form-group">
          <label>Matrix file type:</label><br/>
          <label className="sublabel">
            <input type="radio"
              name={`rawCountsType-${file._id}`}
              value="false"
              checked={!isMtxFile}
              onChange={e => updateFile(file._id, { file_type: 'Expression Matrix' })} />
              &nbsp;Expression Matrix
          </label>
          <label className="sublabel">
            <input type="radio"
              name={`rawCountsType-${file._id}`}
              value="true" checked={isMtxFile}
              onChange={e => updateFile(file._id, { file_type: 'MM Coordinate Matrix' })}/>
              &nbsp;MM Coordinate Matrix
          </label>
        </div>

        <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
        <TextFormField label="Expression Axis Label" fieldName="y_axis_label" file={file} updateFile={updateFile}/>

        <div className="form-group">
          <label>Species</label><br/>
          <Select options={speciesOptions}
            value={selectedSpecies}
            placeholder="Select one..."
            onChange={val => updateFile(file._id, { taxon_id: val.value })}/>
        </div>

        { file.expression_file_info.is_raw_counts &&
          <ExpressionFileInfoSelect label="Units"
            propertyName="units"
            rawOptions={fileMenuOptions.units}
            file={file}
            updateFile={updateFile}/>
        }

        <ExpressionFileInfoSelect label="Biosample Input Type"
          propertyName="biosample_input_type"
          rawOptions={fileMenuOptions.biosample_input_type}
          file={file}
          updateFile={updateFile}/>

        <ExpressionFileInfoSelect label="Library Preparation Protocol"
          propertyName="library_preparation_protocol"
          rawOptions={fileMenuOptions.library_preparation_protocol}
          file={file}
          updateFile={updateFile}/>

        <ExpressionFileInfoSelect label="Modality"
          propertyName="modality"
          rawOptions={fileMenuOptions.modality}
          file={file}
          updateFile={updateFile}/>

        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
        { isMtxFile &&
          <MTXBundledFilesForm {...{ parentFile: file, updateFile, saveFile, deleteFile, handleSaveResponse, addNewFile, associatedChildren }}/>
        }

      </form>
      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>

  </div>
}

/** render a dropdown for an expression file info property */
function ExpressionFileInfoSelect({ label, propertyName, rawOptions, file, updateFile }) {
  const selectOptions = rawOptions.map(opt => ({ label: opt, value: opt }))
  const selectedOption = selectOptions.find(opt => opt.value === file.expression_file_info[propertyName])
  return <div className="form-group">
    <label>{label}</label><br/>
    <Select options={selectOptions}
      value={selectedOption}
      placeholder="Select one..."
      onChange={val => {
        const expInfo = {}
        expInfo[propertyName] = val.value
        updateFile(file._id, { expression_file_info: expInfo })
      }}/>
  </div>
}

