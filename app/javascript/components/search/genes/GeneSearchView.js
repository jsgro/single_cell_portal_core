import React, { useContext, useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlusSquare, faMinusSquare } from '@fortawesome/free-solid-svg-icons'

import { GeneSearchContext } from 'providers/GeneSearchProvider'
import GeneKeyword from './GeneKeyword'
import { hasSearchParams, StudySearchContext } from 'providers/StudySearchProvider'
import SearchPanel from 'components/search/controls/SearchPanel'
import ResultsPanel from 'components/search/results/ResultsPanel'
import StudyGeneExpressions from './StudyGeneExpressions'
import { UserContext } from 'providers/UserProvider'

/**
  * Renders a gene search control panel and the associated results
  * can also show study filter controls if the feature flag gene_study_filter is true
  */
export default function GeneSearchView() {
  const userState = useContext(UserContext)
  const featureFlagState = userState.featureFlagsWithDefaults
  const geneSearchState = useContext(GeneSearchContext)
  const studySearchState = useContext(StudySearchContext)

  const [showStudyControls, setShowStudyControls] = useState(hasSearchParams(studySearchState.params))


  const showStudySearchResults = !geneSearchState.isLoaded &&
                                 !geneSearchState.isLoading &&
                                 !geneSearchState.isError

  let geneSearchPlaceholder = 'Genes (e.g. "PTEN NF2")'
  if (hasSearchParams(studySearchState.params) && featureFlagState.gene_study_filter) {
    geneSearchPlaceholder = 'Search for genes in the filtered studies'
  }

  useEffect(() => {
    // if a search isn't already happening, perform one
    if (showStudySearchResults &&
        !geneSearchState.isLoading &&
        !geneSearchState.isLoaded) {
      geneSearchState.performSearch()
    }
  })

  const helpTextContent = (
    <div>
      Enter a list of one or more genes, separated by spaces.
      <br/>
      Do not include non-genes.
      <br/>
      Search is case-sensitive.
      <br/>
      <br/>
      Examples:
      <ul>
        <li>farsa</li>
        <li>brca1 brca2 pten</li>
      </ul>
    </div>
  )

  const noResultsContent = (
    <div>
      No results found.
      <br/>
      { helpTextContent }
    </div>
  )

  return (
    <div>
      <div className="row">
        <div className="col-md-12 col-sm-12 col-xs-12">
          <GeneKeyword placeholder={geneSearchPlaceholder} helpTextContent={helpTextContent} />
        </div>
      </div>
      { featureFlagState.gene_study_filter &&
        <div className="row gene-study-filter">
          <div className="col-md-2 text-right">
            Study Filter &nbsp;
            <FontAwesomeIcon icon={showStudyControls ? faMinusSquare : faPlusSquare}
              className="action"
              onClick={() => {setShowStudyControls(!showStudyControls)}}/>

          </div>
          <div className="col-md-10">
            { showStudyControls &&
              <SearchPanel
                keywordPrompt="Filter studies by keyword"
                showCommonButtons={false}
                showDownloadButton={false}/> }
          </div>
        </div> }
      <div className="row">
        <div className="col-md-12">
          <ResultsPanel
            studySearchState={geneSearchState}
            studyComponent={StudyGeneExpressions}
            noResultsDisplay={noResultsContent} />
        </div>
        <div className="col-md-12">
          <div id="load-more-genes-target"></div>
        </div>
      </div>
    </div>
  )
}
