import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
import _capitalize from 'lodash/capitalize'
import _clone from 'lodash/clone'

import { fetchExpressionViolin } from 'lib/scp-api'
import { renderViolinPlot } from 'lib/violin-plot'

/** displays a violin plot of expression data for the given gene and study */
export default function StudyViolinPlot({ study, genes, renderParams, setAnnotationList }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // array of gene names as they are listed in the study itself
  const [studyGeneNames, setStudyGeneNames] = useState([])
  const [graphElementId] = useState(_uniqueId('study-violin-'))

  /** gets expression data from the server */
  async function loadData() {
    setIsLoading(true)
    const results = await fetchExpressionViolin(
      study.accession,
      genes,
      renderParams.cluster,
      renderParams.annotation.name,
      renderParams.annotation.type,
      renderParams.annotation.scope,
      renderParams.subsample,
      renderParams.collapseBy
    )
    if (!renderParams.cluster) {
      setAnnotationList(results.annotation_list)
    }
    setIsLoaded(true)
    setIsLoading(false)
    setStudyGeneNames(results.gene_names)
    renderViolinPlot(graphElementId, results)
  }

  // do a load from the server if any parameter has changed *except* renderParams.annotationList
  useEffect(() => {
    if (!isLoading) {
      loadData()
    }
  }, [
    study.accession,
    genes[0],
    renderParams.cluster,
    renderParams.annotation.name,
    renderParams.annotation.scope,
    renderParams.subsample,
    renderParams.collapseBy
  ])
  const isCollapsedView = ['mean', 'median'].indexOf(renderParams.collapseBy) >= 0
  return (
    <>
      <div
        className="expression-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
      </div>
      {
        isLoading &&
        <FontAwesomeIcon
          icon={faDna}
          data-testid={`${graphElementId}-loading-icon`}
          className="gene-load-spinner"
        />
      }
      {/* we have to explicitly test length > 0 below, just asserting .length would
       sometimes render a zero to the page*/}
      { isCollapsedView && studyGeneNames.length > 0 &&
        <div className="text-center">
          <span>{_capitalize(renderParams.collapseBy)} expression of {studyGeneNames.join(', ')}</span>
        </div>
      }
    </>
  )
}
