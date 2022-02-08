import React from 'react'
import { bytesToSize } from 'lib/stats'

/** renders a file download control for the given file object */
export default function FileDownloadControl({ file }) {
  const fileName = file.upload_file_name
  const studyAccession = window.SCP?.currentStudyAccession
  const studyName = window.SCP?.currentStudyName

  /** when button is clicked, open new window on method to redirect to signed URL */
  const handleDownloadClick = () => {
    const downloadUrl = `/single_cell/data/private/${studyAccession}/${studyName}?filename=${fileName}`
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')
  }

  // don't show the control if there's no remote file, or if the user has already selected a replacement
  if (!file.upload_file_name || file.uploadSelection) {
    return null
  } else {
    if (!file.upload_file_name && file.human_data) {
      return null
    } else {
      return <span className="form-group">
        {!file.generation ? <span className="detail no-download-available margin-left" data-toggle="tooltip"
          title='You can download this file once it has been fully uploaded. Check back soon.'>
          Awaiting remote file
        </span> :
          <a onClick={() => handleDownloadClick()} className="btn terra-tertiary-btn" download={fileName}>
            {<span className="fas fa-download"></span> } {bytesToSize(file.upload_file_size)}
          </a>
        }
      </span>
    }
  }
}
