import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'

import DownloadSelectionModal from './DownloadSelectionModal'
import { element } from 'prop-types'
import Tooltip from 'react-bootstrap/lib/Tooltip'
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger'
/**
 * Component for "Download" button which shows a Bulk Download modal on click.
 */
export default function DownloadButton({ searchResults={}, active, msg }) {

  console.log('msg:', msg)

  const [showModal, setShowModal] = useState(false)
  const [message, setMes] = useState(msg)
  const matchingAccessions = searchResults.matchingAccessions || []


  // const [hintmsg, setHintmsg] = useState('ijhg')

  // const isAc = () => {
  //   if (!active) {
  //     setHintmsg ('To download, first do a valid search')
  //   } else {
  //     setHintmsg('Download files for your search results')
  // }
  // }


  /**
   * Reports whether Download button should be active,
   * i.e. user is signed in, has search results,
   * and search has parameters (i.e. user would not download all studies)
   * and download context (i.e. download size preview) has loaded
   */
  // const active = (
  //   userContext.accessToken !== '' &&
  //   matchingAccessions.length > 0 &&
  //   (searchResults?.terms?.length > 0 || searchResults?.facets?.length > 0)
  // )



  const saveDisabled = !active
  const saveButton = <button
    style={{ 'pointerEvents': saveDisabled ? 'none' : 'auto' }}
    type="button"
    id="download-button"
    className="btn btn-primary"
    disabled={saveDisabled}
    data-testid="file-save"
    onClick={() => {setShowModal(!showModal)}}>
    <span>
      <FontAwesomeIcon className="icon-left" icon={faDownload}/>
Download
    </span>
  </button>

  const t = <OverlayTrigger
  placement='top'
  overlay={<Tooltip id='download-tooltip'>{msg}</Tooltip>}>
<span style={{ 'marginLeft': 'auto' }} > {saveButton} </span>
</OverlayTrigger>

  return (
    <>
      {t}
      { showModal &&
        <DownloadSelectionModal
          show={showModal}
          setShow={setShowModal}
          studyAccessions={matchingAccessions}/> }
    </>
  )
}