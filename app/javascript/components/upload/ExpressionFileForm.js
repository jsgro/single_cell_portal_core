import React from 'react'
import _kebabCase from 'lodash/kebabCase'

import Select from 'lib/InstrumentedSelect'
import MTXBundledFilesForm from './MTXBundledFilesForm'
import { FileTypeExtensions } from './FileUploadControl'
import ExpandableFileForm from './ExpandableFileForm'

import { TextFormField } from './form-components'
import { findBundleChildren, validateFile } from './upload-utils'

const REQUIRED_FIELDS = [{ label: 'species', propertyName: 'taxon_id' },
  { label: 'Biosample input type', propertyName: 'expression_file_info.biosample_input_type' },
  { label: 'Library preparation protocol', propertyName: 'expression_file_info.library_preparation_protocol' },
  { label: 'Modality', propertyName: 'expression_file_info.modality' }]
const RAW_COUNTS_REQUIRED_FIELDS = REQUIRED_FIELDS.concat([{
  label: 'units', propertyName: 'expression_file_info.units'
}])

/** renders a form for editing/uploading an expression file (raw or processed) and any bundle children */
export default function ExpressionFileForm({
  file,
  allFiles,
  updateFile,
  saveFile,
  deleteFile,
  addNewFile,
  fileMenuOptions,
  rawCountsOptions,
  bucketName,
  isInitiallyExpanded
}) {
  const associatedChildren = findBundleChildren(file, allFiles)
  const speciesOptions = fileMenuOptions.species.map(spec => ({ label: spec.common_name, value: spec.id }))
  const selectedSpecies = speciesOptions.find(opt => opt.value === file.taxon_id)
  const isMtxFile = file.file_type === 'MM Coordinate Matrix'
  const isRawCountsFile = file.expression_file_info.is_raw_counts

  const allowedFileExts = isMtxFile ? FileTypeExtensions.mtx : FileTypeExtensions.plainText
  const requiredFields = isRawCountsFile ? RAW_COUNTS_REQUIRED_FIELDS : REQUIRED_FIELDS
  const validationMessages = validateFile({ file, allFiles, allowedFileExts, requiredFields })

  const associatedRawCounts = file.expression_file_info.raw_counts_associations.map(id => ({
    label: rawCountsOptions.find(rf => rf.value == id)?.label,
    value: id
  }))

  return <ExpandableFileForm {...{
    file, allFiles, updateFile, saveFile,
    allowedFileExts, deleteFile, validationMessages, bucketName, isInitiallyExpanded
  }}>
    <div className="form-group">
      <label>Matrix file type:</label><br/>
      <label className="sublabel">
        <input type="radio"
          name={`exp-matrix-type-${file._id}`}
          value="false"
          checked={!isMtxFile}
          onChange={e => updateFile(file._id, { file_type: 'Expression Matrix' })} />
          &nbsp;Dense matrix
      </label>
      <label className="sublabel">
        <input type="radio"
          name={`exp-matrix-type-${file._id}`}
          value="true" checked={isMtxFile}
          onChange={e => updateFile(file._id, { file_type: 'MM Coordinate Matrix' })}/>
          &nbsp;Sparse matrix (.mtx)
      </label>
    </div>

    { !isRawCountsFile &&
      <div className="form-group">
        <label className="labeled-select">Associated Raw Counts Files
          <Select options={rawCountsOptions}
            data-analytics-name="expression-raw-counts-select"
            value={associatedRawCounts}
            placeholder="Select one..."
            isMulti={true}
            onChange={val => updateFile(file._id, {
              expression_file_info: {
                raw_counts_associations: val ? val.map(opt => opt.value) : []
              }
            })}/>
        </label>
      </div>
    }

    <div className="form-group">
      <label className="labeled-select" data-testid="expression-select-taxon_id">Species *
        <Select options={speciesOptions}
          data-analytics-name="expression-species-select"
          value={selectedSpecies}
          placeholder="Select one..."
          onChange={val => updateFile(file._id, { taxon_id: val.value })}/>
      </label>
    </div>

    { isRawCountsFile &&
      <ExpressionFileInfoSelect label="Units *"
        propertyName="units"
        rawOptions={fileMenuOptions.units}
        file={file}
        updateFile={updateFile}/>
    }

    <ExpressionFileInfoSelect label="Biosample Input Type *"
      propertyName="biosample_input_type"
      rawOptions={fileMenuOptions.biosample_input_type}
      file={file}
      updateFile={updateFile}/>

    <ExpressionFileInfoSelect label="Library Preparation Protocol *"
      propertyName="library_preparation_protocol"
      rawOptions={fileMenuOptions.library_preparation_protocol}
      file={file}
      updateFile={updateFile}/>

    <ExpressionFileInfoSelect label="Modality *"
      propertyName="modality"
      rawOptions={fileMenuOptions.modality}
      file={file}
      updateFile={updateFile}/>

    <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
    <TextFormField label="Expression Axis Label" fieldName="y_axis_label" file={file} updateFile={updateFile}/>

    { isMtxFile &&
      <MTXBundledFilesForm {...{
        parentFile: file, allFiles, updateFile, saveFile, deleteFile,
        addNewFile, associatedChildren, bucketName
      }}/>
    }
  </ExpandableFileForm>
}

/** render a dropdown for an expression file info property */
function ExpressionFileInfoSelect({ label, propertyName, rawOptions, file, updateFile }) {
  const selectOptions = rawOptions.map(opt => ({ label: opt, value: opt }))
  const selectedOption = selectOptions.find(opt => opt.value === file.expression_file_info[propertyName])
  return <div className="form-group">
    <label className="labeled-select" data-testid={`expression-select-${_kebabCase(propertyName)}`}>{label}
      <Select options={selectOptions}
        data-analytics-name={`expression-select-${_kebabCase(propertyName)}`}
        value={selectedOption}
        placeholder="Select one..."
        onChange={val => {
          const expInfo = {}
          expInfo[propertyName] = val.value
          updateFile(file._id, { expression_file_info: expInfo })
        }}/>
    </label>
  </div>
}

