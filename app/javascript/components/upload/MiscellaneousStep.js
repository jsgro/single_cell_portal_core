import React, { useEffect } from 'react'

import MiscellaneousFileForm from './MiscellaneousFileForm'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_OTHER_FILE = {
  file_type: 'Documentation',
  options: {}
}

const miscFileTypes = ['Other', 'Documentation']
const miscFileFilter = file => miscFileTypes.includes(file.file_type)

export default {
  title: 'Miscellaneous / Other',
  name: 'misc',
  component: MiscellaneousForm,
  fileFilter: miscFileFilter
}

/** Renders a form for uploading one or more miscellaneous files */
function MiscellaneousForm({
  formState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {
  const miscFiles = formState.files.filter(miscFileFilter)

  useEffect(() => {
    if (miscFiles.length === 0) {
      addNewFile(DEFAULT_NEW_OTHER_FILE)
    }
  }, [miscFiles.length])

  return <div>
    <div className="row">
      <h4 className="col-sm-12">Documentation &amp; Other Files</h4>
    </div>
    <div className="row">
      <div className="col-md-12">
        <p className="text-center">
          Any documentation or other support files. These will not be displayed directly, but will be avaialble for users to download.
        </p>
      </div>
    </div>
    { miscFiles.map(file => {
      return <MiscellaneousFileForm
        key={file._id}
        file={file}
        updateFile={updateFile}
        saveFile={saveFile}
        deleteFile={deleteFile}
        miscFileTypes={miscFileTypes}
        handleSaveResponse={handleSaveResponse}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_OTHER_FILE}/>
  </div>
}
