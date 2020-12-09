import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'

import { fetchExpressionViolin } from 'lib/scp-api'
import createTracesAndLayout from 'lib/kernel-functions'
import { plot } from 'lib/plot'
import ClusterControls from './ClusterControls'

/** copied from legacy application.js */
function parseResultsToArray(results) {
  const keys = Object.keys(results.values)
  return keys.sort().map(key => {
    return [key, results.values[key].y]
  })
}

/** Formats expression data for Plotly, renders chart */
function parseAndPlot(results, graphElementId) {
  // The code below is heavily borrowed from legacy application.js
  const dataArray = parseResultsToArray(results)
  const jitter = results.values_jitter ? results.values_jitter : ''
  const traceData = createTracesAndLayout(
    dataArray, results.rendered_cluster, jitter, results.y_axis_title
  )
  const expressionData = [].concat.apply([], traceData[0])
  const expressionLayout = traceData[1]
  // Check that the ID exists on the page to avoid errors in corner cases where users update search terms quickly
  // or are toggling between study and gene view.
  if (document.getElementById(graphElementId)) {
    plot(graphElementId, expressionData, expressionLayout)
  }
}

/** displays a violin plot of expression data for the given gene and study */
export default function StudyViolinPlot({ study, gene }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [graphElementId] = useState(_uniqueId('study-violin-'))
  const [annotationList, setAnnotationList] = useState(null)

  function handleControlUpdate(clusterParams) {
    if (clusterParams.userUpdated) {
      loadData(clusterParams)
    }
  }

  /** gets expression data from the server */
  async function loadData(clusterParams) {
    setIsLoading(true)
    let results
    if (!clusterParams) {
      // this is the initial load
      results = await fetchExpressionViolin(study.accession, gene)
      setAnnotationList(results.annotation_list)
    } else {
      results = await fetchExpressionViolin(study.accession,
        gene,
        clusterParams.cluster,
        clusterParams.annotation.name,
        clusterParams.annotation.scope,
        clusterParams.annotation.type,
        clusterParams.subsample)
    }
    setIsLoaded(true)
    setIsLoading(false)
    parseAndPlot(results, graphElementId)
  }

  useEffect(() => {
    // do a load from the server if this is the initial load
    if (!isLoading && !isLoaded) {
      loadData()
    }
  }, [study.accession, gene])

  return (
    <div className="row graph-container">
      <div className="col-md-10">
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
      </div>
      <div className="col-md-2 graph-controls">
        <ClusterControls studyAccession={study.accession}
          onChange={handleControlUpdate}
          fetchAnnotationList={false}
          preloadedAnnotationList={annotationList}/>
      </div>
    </div>
  )
}
