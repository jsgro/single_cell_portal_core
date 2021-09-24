import React, { useEffect } from 'react'
import Select from 'react-select'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './uploadUtils'

/** renders a form for editing/uploading a single cluster file */
export default function RawCountsFileForm({
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

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
        acceptCharset="UTF-8">

        <FileUploadControl
          handleSaveResponse={handleSaveResponse}
          file={file}
          updateFile={updateFile}
          allowedFileTypes={FileTypeExtensions.plainText}/>
        <div className="form-group">
          <label>Matrix file type:</label><br/>
          <label className="sublabel">
            <input type="radio"
              name={`rawCountsType-${file._id}`}
              value="false"
              checked={file.file_type === 'Expression Matrix'}
              onChange={e => updateFile(file._id, { file_type: 'Expression Matrix' })} />
              &nbsp;Expression Matrix
          </label>
          <label className="sublabel">
            <input type="radio"
              name={`rawCountsType-${file._id}`}
              value="true" checked={file.file_type === 'MM Coordinate Matrix'}
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
        { (file.file_type === 'MM Coordinate Matrix' && file.name) &&
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

function newBarcodesFile(parent) {
  return {
    expression_file_info: {
      is_raw_counts: true
    },
    options: {
      matrix_file_name: parent.name
    },
    file_type: '10X Barcodes File'
  }
}


function newGenesFile(parent) {
  return {
    expression_file_info: {
      is_raw_counts: true
    },
    options: {
      matrix_file_name: parent.name
    },
    file_type: '10X Genes File'
  }
}

/** render both the genes and barcodes upload forms */
function MTXBundledFilesForm({
  parentFile,
  updateFile,
  saveFile,
  deleteFile,
  addNewFile,
  handleSaveResponse,
  associatedChildren
 }) {
  const barcodesFile = associatedChildren.find(f => f.file_type === '10X Barcodes File')
  const genesFile = associatedChildren.find(f => f.file_type === '10X Genes File')
  useEffect(() => {
    if (!barcodesFile) {
      addNewFile(newBarcodesFile(parentFile))
    }
    if (!genesFile) {
      addNewFile(newGenesFile(parentFile))
    }
  }, [barcodesFile, genesFile])

  if (!barcodesFile || !genesFile) {
    return <div>After you&apos;ve selected an mtx file, you&apos;ll be prompted for genes and barcodes files</div>
  }
  return <div>
    <div className="row">
      <div className="col-md-12 ">
        <div className="sub-form">
          <h5>10X Genes File</h5>
          <FileUploadControl
            handleSaveResponse={handleSaveResponse}
            file={genesFile}
            updateFile={updateFile}
            allowedFileTypes={FileTypeExtensions.plainText}/>
          <TextFormField label="Description" fieldName="description" file={genesFile} updateFile={updateFile}/>
          <SaveDeleteButtons file={genesFile} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
        </div>
      </div>
    </div>
    <div className="row">
      <div className="col-md-12">
        <div className="sub-form">
          <h5>10X Barcodes File</h5>
          <FileUploadControl
            handleSaveResponse={handleSaveResponse}
            file={barcodesFile}
            updateFile={updateFile}
            allowedFileTypes={FileTypeExtensions.plainText}/>
          <TextFormField label="Description" fieldName="description" file={barcodesFile} updateFile={updateFile}/>
          <SaveDeleteButtons file={barcodesFile} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
        </div>
      </div>
    </div>
  </div>
}
