import React from 'react'


export default {
  title: 'AnnDataSplitStep',
  header: 'AnnDataSplitStep',
  name: 'AnnDataSplitStep',
  component: AnnDataSplitStep,
  fileFilter: AnnDataFileFilter
}

/** Renders a form for uploading one or more miscellaneous files */
function AnnDataSplitStep({
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
          Introducing AnnData (.hdf5) file upload to Single Cell portal! 
        </p>
      </div>
    </div>
  </div>
}
