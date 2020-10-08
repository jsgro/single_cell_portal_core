import React, { useContext, useEffect, useState } from 'react'
import { faPlusSquare, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Modal from 'react-bootstrap/lib/Modal'

import { updateUserFeatureFlags } from 'lib/scp-api'
import KeywordSearch from './KeywordSearch'
import FacetsPanel from './FacetsPanel'
import DownloadButton from './DownloadButton'
import DownloadProvider from 'providers/DownloadProvider'
import { StudySearchContext } from 'providers/StudySearchProvider'
import { FeatureFlagContext } from 'providers/FeatureFlagProvider'
import { UserContext } from 'providers/UserProvider'

function CommonSearchButtons() {
  const searchState = useContext(StudySearchContext)
  function handleClick(ordering) {
    searchState.updateSearch({ order: ordering })
  }
  return (
    <>
      <span className="facet">
        <a onClick={() => handleClick('popular')}>Most Popular</a>
      </span>
      <span className="facet">
        <a onClick={() => handleClick('recent')}>Most Recent</a>
      </span>
    </>
  )
}

const optInModalContent = (<div>
  <h4 className="text-center">Advanced Search</h4><br/>
  Single Cell Portal now supports searching on specific facets of studies by ontology classifications.
  <br/><br/>
  For example, you can search on studies that
  have <b>species</b> of <b>'Homo sapiens'</b> or have an <b>organ</b> of <b>'brain'</b>. <br/> However, this search functionality is limited to only those studies that provided
  such specific metadata when they were created.<br/>  Currently <b>55 out of the 287</b> SCP public studies provide that metadata.  Keyword searches will still search all available studies.
  <br/><br/>
  For more detailed information, visit our <a href="https://github.com/broadinstitute/single_cell_portal/wiki/Search-Studies" target="_blank">wiki</a>
  <br/>If you are a study creator and would like to provide that metadata for your study to be searchable, see our <a href="https://github.com/broadinstitute/single_cell_portal/wiki/Metadata-Convention">metadata guide</a>
</div>)

const helpModalContent = (<div>
  <h4 className="text-center">Advanced Search</h4><br/>
  Single Cell Portal supports searching on specific facets of studies by ontology classifications.
  <br/><br/>
   For example, you can search on studies that
  have <b>species</b> of <b>'Homo sapiens'</b> or have an <b>organ</b> of <b>'brain'</b>. <br/> However, this search functionality is limited to only those studies that provided
  such specific metadata when they were created.<br/> Currently <b>55 out of the 287</b> SCP public studies provide that metadata.
  <br/><br/>
  For more detailed information, visit our <a href="https://github.com/broadinstitute/single_cell_portal/wiki/Search-Studies" target="_blank">wiki</a>
</div>)

/**
 * Component for SCP faceted search UI
 * showCommonButtons defaults to true
 */
export default function SearchPanel({
  showCommonButtons,
  keywordPrompt,
  searchOnLoad
}) {
  // Note: This might become  a Higher-Order Component (HOC).
  // This search component is currently specific to the "Studies" tab, but
  // could possibly also enable search for "Genes" and "Cells" tabs.
  const featureFlagState = useContext(FeatureFlagContext)
  const searchState = useContext(StudySearchContext)
  const userState = useContext(UserContext)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(featureFlagState.faceted_search)
  const [showSearchHelpModal, setShowSearchHelpModal] = useState(false)
  const [showSearchOptInModal, setShowSearchOptInModal] = useState(false)
  const [isNewToUser, setIsNewToUser] = useState(true)

  let searchButtons = <></>
  let downloadButtons = <></>
  if (showCommonButtons !== false) {
    searchButtons = <CommonSearchButtons/>
  }

  function handleMoreFiltersClick() {
    if (isNewToUser) {
      setShowSearchOptInModal(true)
    } else {
      setAdvancedSearchEnabled(true)
    }
  }

  let advancedOptsLink = <a className="action advanced-opts" onClick={ handleMoreFiltersClick }>
    Advanced search<sup className="newFeature">BETA</sup>
  </a>
  if (showAdvancedSearch) {
    searchButtons = <FacetsPanel/>
    downloadButtons = <DownloadProvider><DownloadButton /></DownloadProvider>
    advancedOptsLink = <a className="action advanced-opts" onClick={() => setShowSearchHelpModal(true)}><FontAwesomeIcon icon={ faQuestionCircle} /></a>
  }

  useEffect(() => {
    // if a search isn't already happening, and searchOnLoad is specified, perform one
    if (!searchState.isLoading && !searchState.isLoaded && searchOnLoad) {
      searchState.performSearch()
    }
  })

  function closeModal(modalShowFunc) {
    modalShowFunc(false)
    // for unknown reasons, clikcing the bootstrap modal auto-scrolls the page down
    // we need to undo that
    setTimeout(() => {scrollTo(0, 0)}, 0)
  }

  function setAdvancedSearchEnabled(enabled, modalShowFunc) {
    if (!userState.isAnonymous) {
      updateUserFeatureFlags({faceted_search: enabled})
    }
    setShowAdvancedSearch(enabled)
    setIsNewToUser(false)
    if (modalShowFunc) {
      closeModal(modalShowFunc)
    }
  }

  return (
    <div id='search-panel'>
      <KeywordSearch keywordPrompt={keywordPrompt}/>
      { searchButtons }
      { advancedOptsLink }
      { downloadButtons }
      <Modal
        show={showSearchOptInModal}
        onHide={() => closeModal(setShowSearchOptInModal)}
        animation={false}
        bsSize='large'>
        <Modal.Body className="">
          { optInModalContent }
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-md btn-primary" onClick={() => {
            setAdvancedSearchEnabled(true, setShowSearchOptInModal)
          }}>Yes, show advanced search</button>
          <button className="btn btn-md" onClick={() => {
            setAdvancedSearchEnabled(false, setShowSearchOptInModal);
          }}>Cancel</button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showSearchHelpModal}
        onHide={() => closeModal(setShowSearchHelpModal)}
        animation={false}
        bsSize='large'>
        <Modal.Body className="">
          { helpModalContent }
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-md btn-primary" onClick={() => {
            setAdvancedSearchEnabled(true, setShowSearchHelpModal)
          }}>Yes, use advanced search</button>
          <button className="btn btn-md" onClick={() => {
            setAdvancedSearchEnabled(false, setShowSearchHelpModal)
          }}>Go back to legacy search</button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

