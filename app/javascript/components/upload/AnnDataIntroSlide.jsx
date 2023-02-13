import React, { useEffect } from 'react'

import MiscellaneousFileForm from './MiscellaneousFileForm'
import { AddFileButton } from './form-components'

export default {
  title: 'Miscellaneous',
  header: 'Documentation & other files',
  name: 'misc',
  component: AnnDataIntroSlide
}

/** Renders a form for uploading one or more miscellaneous files */
function AnnDataIntroSlide({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile
}) {
  
  return <div>
    <div className="row">
      <div className="col-md-12">
        <p className="form-terra">
          Any documentation or other support files. These files will not be used in visualizations, but will be available for users to download.
        </p>
      </div>
    </div>
    {
      <MiscellaneousFileForm
        key={file.oldId ? file.oldId : file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        miscFileTypes={miscFileTypes}
        bucketName={formState.study.bucket_id}
        isInitiallyExpanded={miscFiles.length === 1}/>
    }
  </div>
}
