import React, { useState, useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'

import DownloadSelectionModal from './DownloadSelectionModal'
import { UserContext } from 'providers/UserProvider'
import { wrapButtonWithTooltip } from 'lib/common'


/**
 * Component for "Download" button which shows a Bulk Download modal on click.
 */
export default function DownloadButton({ searchResults={} }) {
  const userContext = useContext(UserContext)

  const [showModal, setShowModal] = useState(false)

  const matchingAccessions = searchResults.matchingAccessions || []

  /**
   * Reports whether Download button should be active,
   * i.e. user is signed in, has search results,
   * and search has parameters (i.e. user would not download all studies)
   * and download context (i.e. download size preview) has loaded
   */
  const active = (
    userContext.accessToken !== '' &&
    matchingAccessions.length > 0 &&
    (searchResults?.terms?.length > 0 || searchResults?.facets?.length > 0)
  )

  let hint = 'Download files for your search results'
  if (!active) {
    if (userContext.accessToken === '') {
      hint = 'To download, please sign in'
    } else {
      hint = 'To download, first do a valid search'
    }
  }

  /** Note that we are reading the TDR file information from the search results object, which
   * means we are reliant on the TDR results being on the current page.  Once we begin paging/sorting
   * TDR results, this approach will have to be revisited */
  const azulFileInfo = searchResults.studies
    ?.filter(result => result.study_source === 'HCA')
    ?.map(result => ({
      accession: result.accession,
      name: result.name,
      study_source: 'HCA',
      description: result.description,
      hca_project_id: result.hca_project_id,
      studyFiles: result.file_information
    }))

  const saveDisabled = !active
  const saveButton = <button
    style={{ pointerEvents: saveDisabled ? 'none' : 'auto' }}
    type="button"
    className="btn btn-primary"
    disabled={saveDisabled}
    data-testid="file-save"
    onClick={() => {setShowModal(!showModal)}}>
    <span>
      <FontAwesomeIcon className="icon-left" icon={faDownload}/>
Download
    </span>
  </button>

  const b = wrapButtonWithTooltip(hint, saveButton, 'hint-for-download-button')

  return (
    <>
      { b }
      { showModal &&
        <DownloadSelectionModal
          show={showModal}
          setShow={setShowModal}
          azulFileInfo={azulFileInfo}
          studyAccessions={matchingAccessions}/> }
    </>
  )
}
