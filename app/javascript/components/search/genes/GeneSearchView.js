import React, { useContext, useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlusSquare, faMinusSquare } from '@fortawesome/free-solid-svg-icons'

import { GeneSearchContext } from 'providers/GeneSearchProvider'
import GeneKeyword from './GeneKeyword'
import { hasSearchParams, StudySearchContext } from 'providers/StudySearchProvider'
import SearchPanel from 'components/search/controls/SearchPanel'
import ResultsPanel from 'components/search/results/ResultsPanel'
import StudyGeneExpressions from './StudyGeneExpressions'
import { FeatureFlagContext } from 'providers/FeatureFlagProvider'


/**
  * Renders a gene search control panel and the associated results
  * can also show study filter controls if the feature flag gene_study_filter is true
  */
export default function GeneSearchView() {
  const featureFlagState = useContext(FeatureFlagContext)
  const geneSearchState = useContext(GeneSearchContext)
  const studySearchState = useContext(StudySearchContext)

  const [showStudyControls, setShowStudyControls] = useState(hasSearchParams(studySearchState.params))


  const showStudySearchResults = !geneSearchState.isLoaded &&
                                 !geneSearchState.isLoading &&
                                 !geneSearchState.isError

  let geneSearchPlaceholder = 'gene names to search (e.g. "agpat pten")'
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

  let helpTextContent = (
    <div>
      <br/>
      For gene search, provide a list of one or more genes, separated by spaces, and do not include non-genes in your terms.
      <br/>
      Search is case-insensitive.
      <br/>
      <br/>
      Example searches:
      <ul>
        <li>farsa</li>
        <li>pten actn1</li>
        <li>brca1 brca2 pten actn1</li>
      </ul>
    </div>
  )

  let noResultsContent = (
    <div>
      No results found
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
