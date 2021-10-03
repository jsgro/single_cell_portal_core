import React, { useEffect } from 'react'

import SequenceFileForm from './SequenceFileForm'
import { findBundleChildren } from './upload-utils'
import { AddFileButton } from './form-components'

const DEFAULT_NEW_SEQUENCE_FILE = {
  file_type: 'Fastq',
  human_fastq_url: '',
  human_data: false,
  options: {}
}

const sequenceFileTypes = ['BAM', 'Fastq']
const sequenceFileFilter = file => sequenceFileTypes.includes(file.file_type)

export default {
  title: 'Sequence Files',
  name: 'sequence',
  component: SequenceForm,
  fileFilter: sequenceFileFilter
}

/** Renders a form for uploading one or more sequence files */
function SequenceForm({
  formState,
  serverState,
  addNewFile,
  updateFile,
  saveFile,
  deleteFile,
  handleSaveResponse
}) {
  const sequenceFiles = formState.files.filter(sequenceFileFilter)

  useEffect(() => {
    if (sequenceFiles.length === 0) {
      addNewFile(DEFAULT_NEW_SEQUENCE_FILE)
    }
  }, [sequenceFiles.length])

  return <div>
    <div className="row">
      <h4 className="col-sm-12">Sequence Files</h4>
    </div>
    <div className="row">
      <div className="col-md-12">
        <div className="form-terra">
          Primary sequence information, such as BAM, BAM Index, and Fastq files<br/>
          <p>
            <b>Non-human Data</b><br/>
            If you have a few, small (under 2GB) non-human sequence files, they can be uploaded here.
            For uploading many or larger files, please refer to the instructions in
            our <a href="https://singlecell.zendesk.com/hc/en-us/articles/360061006011-Uploading-Large-Files-Using-Gsutil-Tool" target="_blank" rel="noopener noreferrer">documentation</a>.
          </p>
          <p>
            If you already have gsutil installed you can upload files directly using the following command:
          </p>
          <pre>
            gsutil -m cp /path/to/files gs://{formState.study.bucket_id}
          </pre>
          <p>
            <b>Primary Human Data</b><br/>
            Primary sequence data derived from humans should be stored in other biological databases and can be linked here
            by selecting 'Yes' for 'Primary Human Data' and then providing a link in the text field.
          </p>
        </div>
      </div>
    </div>
    { sequenceFiles.map(file => {
      const associatedBaiFile = findBundleChildren(file, formState.files)[0]
      return <SequenceFileForm
        key={file._id}
        file={file}
        allFiles={formState.files}
        updateFile={updateFile}
        saveFile={saveFile}
        addNewFile={addNewFile}
        deleteFile={deleteFile}
        sequenceFileTypes={sequenceFileTypes}
        fileMenuOptions={serverState.menu_options}
        handleSaveResponse={handleSaveResponse}
        associatedBaiFile={associatedBaiFile}/>
    })}
    <AddFileButton addNewFile={addNewFile} newFileTemplate={DEFAULT_NEW_SEQUENCE_FILE}/>
  </div>
}
