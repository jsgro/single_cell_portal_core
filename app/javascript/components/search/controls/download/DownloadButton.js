import React, { useState, useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import Tooltip from 'react-bootstrap/lib/Tooltip'
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger'

import DownloadModal from './DownloadModal'
import { hasSearchParams } from 'providers/StudySearchProvider'
import { UserContext } from 'providers/UserProvider'

/**
 * Component for "Download" button and Bulk Download modal.
 */
export default function DownloadButton({searchResults={}}) {
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
    searchResults && hasSearchParams(searchResults)
  )

  let hint = 'Download files for your search results'
  if (!active) {
    if (userContext.accessToken === '') {
      hint = 'To download, please sign in'
    } else {
      hint = 'To download, first do a search'
    }
  }

  return (
    <>
      <OverlayTrigger
        placement='top'
        overlay={<Tooltip id='download-tooltip'>{hint}</Tooltip>}>
        <button
          id='download-button'
          className={`btn btn-primary ${active ? 'active' : 'disabled'}`}
          disabled={!active}
          onClick={() => {setShowModal(!showModal)}}>
          <span>
            <FontAwesomeIcon className="icon-left" icon={faDownload}/>
          Download
          </span>
        </button>
      </OverlayTrigger>
      { showModal && <DownloadModal show={showModal} setShow={setShowModal} studyAccessions={matchingAccessions}/> }
    </>
  )
}
