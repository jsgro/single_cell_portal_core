import React, { useEffect } from 'react'

import Select from 'lib/InstrumentedSelect'
import FileUploadControl from './FileUploadControl'
import { TextFormField, SavingOverlay, SaveDeleteButtons } from './form-components'

/** renders a form for editing/uploading a sequence file and any assoicated bundle files */
export default function SequenceFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  addNewFile,
  handleSaveResponse,
  sequenceFileTypes,
  fileMenuOptions,
  associatedBaiFile
}) {
  const speciesOptions = fileMenuOptions.species.map(spec => ({ label: spec.common_name, value: spec.id }))
  const selectedSpecies = speciesOptions.find(opt => opt.value === file.taxon_id)
  let assemblyOptions = []
  if (selectedSpecies) {
    // filter the assemblies by the selected species
    assemblyOptions = fileMenuOptions.genome_assemblies
      .filter(ga => ga.taxon_id === selectedSpecies.value)
      .map(ga => ({ label: ga.name, value: ga.id }))
  }
  const selectedAssembly = assemblyOptions.find(opt => opt.value === file.genome_assembly_id)

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`misc-file-form-${file._id}`}
        className="form-terra"
        onSubmit={e => e.preventDefault()}
        acceptCharset="UTF-8">
        <div className="form-group">
          <label>Primary Human Data?</label><br/>
          <label className="sublabel">
            <input type="radio"
              name={`sequenceHuman-${file._id}`}
              value="false"
              checked={!file.human_data}
              onChange={e => updateFile(file._id, { human_data: false })} />
              &nbsp;No
          </label>
          <label className="sublabel">
            <input type="radio"
              name={`sequenceHuman-${file._id}`}
              value="true" checked={file.human_data}
              onChange={e => updateFile(file._id, { human_data: true, file_type: 'Fastq' })}/>
              &nbsp;Yes
          </label>
        </div>
        { !file.human_data && <>
          <div className="row">
            <div className="col-md-12">
              <FileUploadControl
                handleSaveResponse={handleSaveResponse}
                file={file}
                updateFile={updateFile}/>
            </div>
          </div>
          <div className="form-group">
            <label className="labeled-select">File type:
              <Select options={sequenceFileTypes.map(ft => ({ label: ft, value: ft }))}
                data-analytics-name="sequence-file-type"
                value={{ label: file.file_type, value: file.file_type }}
                onChange={val => updateFile(file._id, { file_type: val.value })}/>
            </label>
          </div>
        </> }
        { file.human_data &&
          <div className="row">
            <div className="col-md-12">
              <TextFormField label="Link to primary human fastq file"
                fieldName="human_fastq_url"
                file={file}
                updateFile={updateFile}/>
              <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
            </div>
          </div>
        }


        <div className="form-group">
          <label className="labeled-select">Species
            <Select options={speciesOptions}
              data-analytics-name="sequence-species-select"
              value={selectedSpecies}
              placeholder="Select one..."
              onChange={val => updateFile(file._id, { taxon_id: val.value })}/>
          </label>
        </div>
        { file.file_type === 'BAM' &&
          <div className="form-group">
            <label className="labeled-select">Genome Assembly
              <Select options={assemblyOptions}
                data-analytics-name="sequence-assembly-select"
                value={selectedAssembly}
                placeholder="Select one..."
                onChange={val => updateFile(file._id, { genome_assembly_id: val.value })}/>
            </label>
          </div>
        }
        <div className="form-group">
          <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
        </div>
        <SaveDeleteButtons file={file} updateFile={updateFile} saveFile={saveFile} deleteFile={deleteFile}/>
        { (file.file_type === 'BAM' || associatedBaiFile) &&
          <BamIndexFileForm parentFile={file}
            file={associatedBaiFile}
            updateFile={updateFile}
            saveFile={saveFile}
            deleteFile={deleteFile}
            handleSaveResponse={handleSaveResponse}
            addNewFile={addNewFile}/>
        }

      </form>

      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}

/** renders a control for uploading a BAM Index file */
function BamIndexFileForm({
  file,
  parentFile,
  updateFile,
  saveFile,
  deleteFile,
  addNewFile,
  handleSaveResponse
}) {
  let validationMessage = ''
  // don't allow saving until parent file is saved
  const parentSaved = parentFile._id && !parentFile._id.includes('newFile')
  if (!parentSaved) {
    validationMessage = 'BAM file must be saved first'
  }

  // add an empty file to be filled in if none are there
  useEffect(() => {
    if (!file) {
      addNewFile({
        file_type: 'BAM Index',
        human_fastq_url: '',
        human_data: false,
        options: { bam_id: parentFile._id }
      })
    }
  }, [file])

  // if parent id changes, update the child bam_id pointer
  useEffect(() => {
    if (file) {
      updateFile(file._id, { options: { bam_id: parentFile._id } })
    }
  }, [parentFile._id])

  if (!file) {
    return <span></span>
  }
  return <div className="row">
    <div className="col-md-12 ">
      <div className="sub-form">
        <h5>BAM Index File</h5>
        <FileUploadControl
          handleSaveResponse={handleSaveResponse}
          file={file}
          updateFile={updateFile}/>
        <TextFormField label="Description" fieldName="description" file={file} updateFile={updateFile}/>
        <SaveDeleteButtons
          file={file}
          updateFile={updateFile}
          saveFile={saveFile}
          deleteFile={deleteFile}
          saveEnabled={parentSaved}
          validationMessage={validationMessage}/>
      </div>
      <SavingOverlay file={file} updateFile={updateFile}/>
    </div>
  </div>
}
