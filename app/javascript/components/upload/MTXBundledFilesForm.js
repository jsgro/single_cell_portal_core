import React, { useEffect } from 'react'

import FileUploadControl, { FileTypeExtensions } from './FileUploadControl'
import { TextFormField, SaveDeleteButtons, SavingOverlay } from './form-components'
import { validateFile } from './upload-utils'

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
  allFiles,
  saveFile,
  deleteFile,
  addNewFile,
  associatedChildren,
  bucketName
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
    return <div>After you&apos;ve selected an mtx file, you&apos;ll be prompted for features and barcodes files</div>
  }
  const barcodesValidationMessages = validateFile({
    file: barcodesFile, allFiles, allowedFileExts: FileTypeExtensions.plainText
  })
  const genesValidationMessages = validateFile({
    file: genesFile, allFiles, allowedFileExts: FileTypeExtensions.plainText
  })

  return <div>
    <div className="row">
      <div className="col-md-12 ">
        <div className="sub-form">
          <h5>10x Features File</h5>
          <div className="upload-form-header flexbox-align-center expanded">
            <FileUploadControl
              file={genesFile}
              allFiles={allFiles}
              updateFile={updateFile}
              validationMessages={genesValidationMessages}
              allowedFileExts={FileTypeExtensions.plainText}
              bucketName={bucketName}/>
            <SaveDeleteButtons
              file={genesFile}
              updateFile={updateFile}
              saveFile={saveFile}
              deleteFile={deleteFile}
              validationMessages={genesValidationMessages} />
          </div>
          <TextFormField label="Description" fieldName="description" file={genesFile} updateFile={updateFile}/>
        </div>
        <SavingOverlay file={genesFile} updateFile={updateFile}/>
      </div>
    </div>
    <div className="row">
      <div className="col-md-12">
        <div className="sub-form">
          <h5>10x Barcodes File</h5>
          <div className="upload-form-header flexbox-align-center expanded">
            <FileUploadControl
              file={barcodesFile}
              allFiles={allFiles}
              updateFile={updateFile}
              validationMessages={barcodesValidationMessages}
              allowedFileExts={FileTypeExtensions.plainText}
              bucketName={bucketName}/>
            <SaveDeleteButtons
              file={barcodesFile}
              updateFile={updateFile}
              saveFile={saveFile}
              deleteFile={deleteFile}
              validationMessages={barcodesValidationMessages}/>
          </div>
          <TextFormField label="Description" fieldName="description" file={barcodesFile} updateFile={updateFile}/>
        </div>
      </div>
      <SavingOverlay file={barcodesFile} updateFile={updateFile}/>
    </div>
  </div>
}
