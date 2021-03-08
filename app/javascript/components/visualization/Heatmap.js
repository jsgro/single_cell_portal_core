import React, { useState, useEffect, useRef } from 'react'
import _uniqueId from 'lodash/uniqueId'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna, faArrowsAltV, faArrowsAltH, faArrowsAlt } from '@fortawesome/free-solid-svg-icons'

import { log, startPendingEvent } from 'lib/metrics-api'
import { getExpressionHeatmapURL, getAnnotationCellValuesURL } from 'lib/scp-api'
import { morpheusTabManager } from './DotPlot'
import { useUpdateEffect } from 'hooks/useUpdate'

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
export default function Heatmap({
  studyAccession, genes=[], cluster, annotation={}, subsample, geneList, heatmapFit, heatmapRowCentering, dimensions
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
  const annotationCellValuesURL = getAnnotationCellValuesURL(studyAccession,
    cluster,
    annotation.name,
    annotation.scope,
    annotation.type,
    subsample,
    geneList)

  let dimensionsFn = null
  if (dimensions.width) {
    dimensionsFn = () => dimensions.width
  }

  useEffect(() => {
    // we can't render until we know what the cluster is, since morpheus requires the annotation name
    if (cluster) {
      const plotEvent = startPendingEvent('plot:heatmap', window.SCP.getLogPlotProps())
      log('heatmap:initialize')
      morpheusHeatmap.current = renderHeatmap({
        target: `#${graphId}`,
        expressionValuesURL,
        annotationCellValuesURL,
        annotationName: annotation.name,
        dimensionsFn,
        fit: heatmapFit,
        rowCentering: heatmapRowCentering
      })
      plotEvent.complete()
    }
  }, [
    studyAccession,
    genes.join(','),
    cluster,
    annotation.name,
    annotation.scope,
    heatmapRowCentering
  ])

  useUpdateEffect(() => {
    if (morpheusHeatmap.current && morpheusHeatmap.current.fitToWindow) {
      const fit = heatmapFit
      morpheusHeatmap.current.fitToWindow({
        fitRows: fit === 'rows' || fit === 'both',
        fitColumns: fit === 'cols' || fit === 'both',
        repaint: true
      })
    }
  }, [heatmapFit])

  return (
    <div className="plot">
      { cluster &&
        <div id={graphId} className="heatmap-graph" style={{ minWidth: '80vw' }}></div> }
      { !cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
    </div>
  )
}

/** Render Morpheus heatmap */
function renderHeatmap({
  target, expressionValuesURL, annotationCellValuesURL, annotationName,
  dimensionsFn, fit, rowCentering
}) {
  const $target = $(target)
  $target.empty()

  const config = {
    dataset: expressionValuesURL,
    el: $target,
    menu: null,
    colorScheme: {
      scalingMode: rowCentering !== '' ? 'fixed' : 'relative'
    },
    focus: null,
    // We implement our own trivial tab manager as it seems to be the only way
    // (after 2+ hours of digging) to prevent morpheus auto-scrolling
    // to the heatmap once it's rendered
    tabManager: morpheusTabManager($target, dimensionsFn)
  }

  // Fit rows, columns, or both to screen
  if (fit === 'cols') {
    config.columnSize = 'fit'
  } else if (fit === 'rows') {
    config.rowSize = 'fit'
  } else if (fit === 'both') {
    config.columnSize = 'fit'
    config.rowSize = 'fit'
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
      { field: annotationName, display: 'text' }
    ]
    config.rows = [
      { field: 'id', display: 'text' }
    ]
  }
  return new window.morpheus.HeatMap(config)
}
