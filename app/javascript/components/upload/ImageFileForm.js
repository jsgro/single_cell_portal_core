import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select'

import FileUploadControl from './FileUploadControl'
import { TextFormField, SavingOverlay } from './uploadUtils'

/** renders a form for editing/uploading an image file */
export default function ImageFileForm({
  file,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse,
  associatedClusterFileOptions,
  updateCorrespondingClusters
}) {

  const spatialClusterAssocs = file.spatial_cluster_associations.map(id => associatedClusterFileOptions.find(opt => opt.value === id))
  let imagePreviewUrl = '#'
  if (file.uploadSelection) {
    imagePreviewUrl = URL.createObjectURL(file.uploadSelection)
  }

  return <div className="row top-margin" key={file._id}>
    <div className="col-md-12">
      <form id={`clusterForm-${file._id}`}
        className="form-terra"
        acceptCharset="UTF-8">
        <div className="row">
          <div className="col-md-6">
            <FileUploadControl
              handleSaveResponse={handleSaveResponse}
              file={file}
              updateFile={updateFile}
              allowedFileTypes={window.ALLOWED_FILE_TYPES['plainText']}/>
          </div>
          <div className="col-md-6">
            { file.uploadSelection && <img className="preview-image" src={imagePreviewUrl} alt={file.uploadSelection.name} /> }
          </div>
        </div>
        <TextFormField label="Name" fieldName="name" file={file} updateFile={updateFile}/>
        <div className="form-group">
          <label>Corresponding clusters / spatial data:</label><br/>
          <Select options={associatedClusterFileOptions}
            value={spatialClusterAssocs}
            isMulti={true}
            placeholder="None"
            onChange={val => updateCorrespondingClusters(file, val)}/>
        </div>
        <div className="form-group">
          <TextFormField label="Description / Legend (this will be displayed below image)" fieldName="description" file={file} updateFile={updateFile}/>
        </div>

        <button type="button" className="btn btn-primary" disabled={!file.isDirty} onClick={() => saveFile(file)}>
          Save
          { file.submitData && <span> &amp; Upload</span> }
        </button> &nbsp;
        <button type="button" className="btn btn-danger cancel float-right" onClick={() => deleteFile(file)}>
          <i className="fas fa-trash"></i> Delete
        </button>
      </form>
    </div>
    <SavingOverlay file={file} updateFile={updateFile}/>
  </div>
}
