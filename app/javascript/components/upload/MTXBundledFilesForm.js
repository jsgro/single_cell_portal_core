import React, { useEffect } from 'react'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SaveDeleteButtons, SavingOverlay } from './uploadUtils'


/** return a blank barcodes file associated with the parent */
function newBarcodesFile(parent) {
  return {
    options: {
      matrix_id: parent._id
    },
    file_type: '10X Barcodes File'
  }
}

/** return a blank barcodes file associated with the parent */
function newGenesFile(parent) {
  return {
    options: {
      matrix_id: parent._id
    },
    file_type: '10X Genes File'
  }
}

/** render both the genes and barcodes upload forms */
export default function MTXBundledFilesForm({
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
  }, [])

  useEffect(() => {
    if (barcodesFile && genesFile) {
      updateFile(barcodesFile._id, { options: { matrix_id: parentFile._id } })
      updateFile(genesFile._id, { options: { matrix_id: parentFile._id } })
    }
  }, [parentFile._id])

  if (!barcodesFile || !genesFile) {
    return <div>After you&apos;ve selected an mtx file, you&apos;ll be prompted for genes and barcodes files</div>
  }

  let validationMessage = ''
  // don't allow saving until parent file is saved
  const parentSaved = parentFile._id && !parentFile._id.includes('newFile')
  if (!parentSaved) {
    validationMessage = 'Parent file must be saved first'
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
          <SaveDeleteButtons
            file={genesFile}
            updateFile={updateFile}
            saveFile={saveFile}
            deleteFile={deleteFile}
            saveEnabled={parentSaved}
            validationMessage={validationMessage} />
        </div>
        <SavingOverlay file={genesFile} updateFile={updateFile}/>
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
          <SaveDeleteButtons
            file={barcodesFile}
            updateFile={updateFile}
            saveFile={saveFile}
            deleteFile={deleteFile}
            saveEnabled={parentSaved}
            validationMessage={validationMessage}/>
        </div>
      </div>
      <SavingOverlay file={barcodesFile} updateFile={updateFile}/>
    </div>
  </div>
}
