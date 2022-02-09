import React, { useContext } from 'react'
import { bytesToSize } from 'lib/stats'
import { StudyContext } from 'components/upload/UploadWizard'
import LoadingSpinner from 'lib/LoadingSpinner'

/** renders a file download control for the given file object */
export default function FileDownloadControl({ file }) {
  const fileName = file.upload_file_name
  const studyObject = useContext(StudyContext)
  const studyAccession = studyObject?.accession
  const studyName = studyObject?.url_safe_name

  /** when button is clicked, open new window on method to redirect to signed URL */
  const handleDownloadClick = () => {
    const downloadUrl = `/single_cell/data/private/${studyAccession}/${studyName}?filename=${fileName}`
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')
  }

  if (!file.upload_file_name || file.uploadSelection) {
    // don't show the control if there's no remote file, or if the user has already selected a replacement
    return null
  }
  
  if (!file.upload_file_name && file.human_data) {
    // don't show the control if this is a sequence file hosted elsewhere
    return null
  }

  if (!file.serverFile?.generation) {
    // the file does not yet exist in the Terra workspace
    return <span className="form-group">
      <span className="detail no-download-available margin-left" data-toggle="tooltip"
        title='You can download this file once it has been fully uploaded. Check back soon.'>
        Awaiting remote file <LoadingSpinner/>
      </span>
    </span>
  }

  return <span className="form-group">
    <a onClick={() => handleDownloadClick()} className="btn terra-tertiary-btn">
      <span className="fas fa-download"></span> {bytesToSize(file.upload_file_size)}
    </a>
  </span>
}
