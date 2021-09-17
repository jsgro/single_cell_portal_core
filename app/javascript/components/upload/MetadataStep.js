import React, { useEffect } from 'react'
import metadataExplainerImage from 'images/metadata-convention-explainer.jpg'

const DEFAULT_NEW_METADATA_FILE = {
  file_type: 'Metadata'
}

const metadataFileFilter = file => file.file_type === 'Metadata'

export default {
  title: 'Metadata',
  name: 'metadata',
  component: MetadataForm,
  fileFilter: metadataFileFilter
}

/** Renders a form for uploading one or more cluster/spatial files */
function MetadataForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {
  const metadataFile = formState.files.find(metadataFileFilter)

  useEffect(() => {
    if (!metadataFile) {
      addNewFile(DEFAULT_NEW_METADATA_FILE)
    }
  }, [metadataFile?._id])

  return <div>
    <div className="row">
      <h4 className="col-sm-12">3. Metadata</h4>
    </div>
    <div className="row">
      <div className="col-md-12" id="metadata-convention-explainer">
        <img src={metadataExplainerImage}/>
        <a id="metadata-convention-example-link"
          href="https://singlecell.zendesk.com/hc/en-us/articles/360060609852-Required-Metadata"
          target="_blank" rel="noopener noreferrer">
          View required conventional metadata
        </a>
      </div>
    </div>
  </div>
}
