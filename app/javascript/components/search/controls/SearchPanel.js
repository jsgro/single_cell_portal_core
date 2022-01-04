import React, { useContext, useEffect, useState } from 'react'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Modal from 'react-bootstrap/lib/Modal'

import KeywordSearch from './KeywordSearch'
import FacetsPanel from './FacetsPanel'
import DownloadButton from './download/DownloadButton'
import { StudySearchContext } from 'providers/StudySearchProvider'
import { UserContext } from 'providers/UserProvider'


const publicStudies = window.SCP.studyStats.public
const compliantStudies = window.SCP.studyStats.compliant
const percentage = (compliantStudies / publicStudies * 100).toFixed(0)
const helpModalContent = (<div>
  <h4 className="text-center">Advanced Search</h4><br/>
  Single Cell Portal supports searching on specific facets of studies by ontology classifications.
  <br/><br/>
  For example, you can search on studies that
  have <b>species</b> of <b>&quot;Homo sapiens&quot;</b> or have an <b>organ</b> of <b>&quot;brain&quot;</b>.{' '}
  ~<b>{percentage}% ({compliantStudies} of {publicStudies})</b> public studies in SCP provide this metadata
  information.
  {/*
   more information on public/compliant studies available at
   https://docs.google.com/spreadsheets/d/1FSpP2XTrG9FqAqD9X-BHxkCZae9vxZA3cQLow8mn-bk
*/}
  <br/><br/>
  For more detailed information, visit
  our{' '}
  <a href="https://singlecell.zendesk.com/hc/en-us/articles/360061006431-Search-Studies"
    target="_blank" rel="noreferrer">documentation
  </a>.  Study authors looking to make their studies more accessible can read our
  <a href="https://singlecell.zendesk.com/hc/en-us/articles/4406379107355-Metadata-powered-Advanced-Search"
    target="_blank" rel="noreferrer"> metadata guide
  </a>.
</div>)


/**
 * Component for SCP faceted search UI
 * showCommonButtons defaults to true
 */
export default function SearchPanel({
  searchOnLoad
}) {
  // Note: This might become  a Higher-Order Component (HOC).
  // This search component is currently specific to the "Studies" tab, but
  // could possibly also enable search for "Genes" and "Cells" tabs.
  const searchState = useContext(StudySearchContext)
  const [showSearchHelpModal, setShowSearchHelpModal] = useState(false)
  const userContext = useContext(UserContext)

  // const [hintmsg, setHintmsg] = useState('ijhg')
  const matchingAccessions = searchState.results.matchingAccessions || []

  const ac = (
    userContext.accessToken !== '' &&
    matchingAccessions.length > 0 &&
    (searchState.results?.terms?.length > 0 || searchState.results?.facets?.length > 0)
  )
console.log('ac:', ac)

const hintmsg = !ac ? 'To download, first do a valid search' : 'Download files for your search results'
  //     setHintmsg ('To download, first do a valid search')
  //   } else {
  //     setHintmsg('Download files for your search results')
  // }
  

  let searchButtons = <></>
  let downloadButtons = <></>


  /**
   * Reports whether Download button should be active,
   * i.e. user is signed in, has search results,
   * and search has parameters (i.e. user would not download all studies)
   * and download context (i.e. download size preview) has loaded
   */




  searchButtons = <FacetsPanel/>
  downloadButtons = <DownloadButton searchResults={searchState.results} active={ac} msg={hintmsg}/>
  const advancedOptsLink = <a className="action advanced-opts"
    onClick={() => setShowSearchHelpModal(true)}
    data-analytics-name="search-help">
    <FontAwesomeIcon icon={faQuestionCircle} />
  </a>


  useEffect(() => {
    // if a search isn't already happening, and searchOnLoad is specified, perform one
    if (!searchState.isLoading && !searchState.isLoaded && searchOnLoad) {
      searchState.performSearch()
    }
  })

  /** helper method as, for unknown reasons, clicking the bootstrap modal auto-scrolls the page down */
  function closeModal(modalShowFunc) {
    modalShowFunc(false)
    setTimeout(() => {scrollTo(0, 0)}, 0)
  }

  const keywordPrompt = searchState.params.preset === 'covid19' ? 'Search COVID-19 studies' : undefined
  return (
    <div id='search-panel' style={{ display: 'flex' }}>
      <KeywordSearch keywordPrompt={keywordPrompt}/>
      { searchButtons }
      { advancedOptsLink }
      { downloadButtons }
      <Modal
        show={showSearchHelpModal}
        onHide={() => closeModal(setShowSearchHelpModal)}
        animation={false}
        bsSize='large'>
        <Modal.Body className="">
          { helpModalContent }
        </Modal.Body>
      </Modal>
    </div>
  )
}
