import React, { useState, useEffect, useRef } from 'react'
import _uniqueId from 'lodash/uniqueId'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsAltV, faArrowsAltH, faArrowsAlt } from '@fortawesome/free-solid-svg-icons'

import { log } from 'lib/metrics-api'
import { getExpressionHeatmapURL, getAnnotationCellValuesURL, getGeneListColsURL } from 'lib/scp-api'
import { morpheusTabManager, logMorpheusPerfTime } from './DotPlot'
import { useUpdateEffect } from 'hooks/useUpdate'
import useErrorMessage, { morpheusErrorHandler } from 'lib/error-message'
import { withErrorBoundary } from 'lib/ErrorBoundary'
import LoadingSpinner from 'lib/LoadingSpinner'

export const ROW_CENTERING_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Z-score [(v - mean) / stdev]', value: 'z-score' },
  { label: 'Robust z-score [(v - median) / MAD]', value: 'robust z-score' }
]

export const DEFAULT_ROW_CENTERING = ''

export const FIT_OPTIONS = [
  { label: <span>None</span>, value: '' },
  { label: <span><FontAwesomeIcon icon={faArrowsAltV}/> Rows</span>, value: 'rows' },
  { label: <span><FontAwesomeIcon icon={faArrowsAltH}/> Columns</span>, value: 'cols' },
  { label: <span><FontAwesomeIcon icon={faArrowsAlt}/> Both</span>, value: 'both' }
]
export const DEFAULT_FIT = ''

/** renders a morpheus powered heatmap for the given params
  * @param genes {Array[String]} array of gene names
  * @param cluster {string} the name of the cluster, or blank/null for the study's default
  * @param annotation {obj} an object with name, type, and scope attributes
  * @param subsample {string} a string for the subsampel to be retrieved.
  * @param geneList {string} a string for the gene list (precomputed score) to be retrieved.
 */
function RawHeatmap({
  studyAccession, genes=[], cluster, annotation={}, subsample, geneList, heatmapFit, heatmapRowCentering
}) {
  const [graphId] = useState(_uniqueId('heatmap-'))
  const morpheusHeatmap = useRef(null)
  const expressionValuesURL = getExpressionHeatmapURL({
    studyAccession,
    genes,
    cluster,
    heatmapRowCentering,
    geneList
  })
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()

  let annotationCellValuesURL
  // determine where we get our column headers from
  if (!geneList) {
    annotationCellValuesURL = getAnnotationCellValuesURL({
      studyAccession,
      cluster,
      annotationName: annotation.name,
      annotationScope: annotation.scope,
      annotationType: annotation.type,
      subsample
    })
  } else {
    annotationCellValuesURL = getGeneListColsURL({ studyAccession, geneList })
  }

  useEffect(() => {
    // we can't render until we know what the cluster is, since morpheus requires the annotation name
    if (cluster) {
      performance.mark(`perfTimeStart-${graphId}`)

      log('heatmap:initialize')
      setShowError(false)
      morpheusHeatmap.current = renderHeatmap({
        target: `#${graphId}`,
        expressionValuesURL,
        annotationCellValuesURL,
        annotationName: !geneList ? annotation.name : geneList,
        fit: heatmapFit,
        rowCentering: heatmapRowCentering,
        setShowError,
        setErrorContent,
        genes
      })
    }
  }, [
    studyAccession,
    genes.join(','),
    cluster,
    annotation.name,
    annotation.scope,
    heatmapRowCentering,
    geneList
  ])

  useUpdateEffect(() => {
    if (morpheusHeatmap.current && morpheusHeatmap.current.fitToWindow) {
      const fit = heatmapFit
      if (fit === '') {
        morpheusHeatmap.current.resetZoom()
      } else {
        morpheusHeatmap.current.fitToWindow({
          fitRows: fit === 'rows' || fit === 'both',
          fitColumns: fit === 'cols' || fit === 'both',
          repaint: true
        })
      }
    }
  }, [heatmapFit])

  return (
    <div className="plot">
      { ErrorComponent }
      { cluster &&
        <div id={graphId} className="heatmap-graph" style={{ minWidth: '80vw' }}></div> }
      { !cluster && <LoadingSpinner/> }
    </div>
  )
}


const Heatmap = withErrorBoundary(RawHeatmap)
export default Heatmap

/** Render Morpheus heatmap */
function renderHeatmap({
  target, expressionValuesURL, annotationCellValuesURL, annotationName,
  fit, rowCentering, setShowError, setErrorContent, genes
}) {
  const $target = $(target)
  $target.empty()

  const config = {
    dataset: expressionValuesURL,
    el: $target,
    menu: null,
    error: morpheusErrorHandler($target, setShowError, setErrorContent),
    colorScheme: {
      scalingMode: rowCentering !== '' ? 'fixed' : 'relative'
    },
    focus: null,
    // We implement our own trivial tab manager as it seems to be the only way
    // (after 2+ hours of digging) to prevent morpheus auto-scrolling
    // to the heatmap once it's rendered
    tabManager: morpheusTabManager($target),
    loadedCallback: () => logMorpheusPerfTime(target, 'heatmap', genes)
  }

  // Fit rows, columns, or both to screen
  if (fit === 'cols') {
    config.columnSize = 'fit'
  } else if (fit === 'rows') {
    config.rowSize = 'fit'
  } else if (fit === 'both') {
    config.columnSize = 'fit'
    config.rowSize = 'fit'
  } else if (fit === 'none') {
    config.columnSize = null
    config.rowSize = null
  } else {
    config.columnSize = null
    config.rowSize = null
  }

  // Load annotations if specified
  if (annotationCellValuesURL !== '') {
    config.columnAnnotations = [{
      file: annotationCellValuesURL,
      datasetField: 'id',
      fileField: 'NAME',
      include: [annotationName]
    }]
    config.columnSortBy = [
      { field: annotationName, order: 0 }
    ]
    config.columns = [
      { field: 'id', display: 'text' },
      { field: annotationName, display: 'color' }
    ]
    config.rows = [
      { field: 'id', display: 'text' }
    ]
  }
  return new window.morpheus.HeatMap(config)
}
