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

/** renders a morpheus powered heatmap for the given params */
export default function Heatmap({ studyAccession, genes, dataParams, renderParams={}, dimensionsFn }) {
  const [graphId] = useState(_uniqueId('heatmap-'))
  const morpheusHeatmap = useRef(null)
  const expressionValuesURL = getExpressionHeatmapURL({
    studyAccession,
    genes,
    cluster: dataParams.cluster,
    heatmapRowCentering: dataParams.heatmapRowCentering
  })
  const annotationCellValuesURL = getAnnotationCellValuesURL(studyAccession,
    dataParams.cluster,
    dataParams.annotation.name,
    dataParams.annotation.scope,
    dataParams.annotation.type,
    dataParams.subsample)

  useEffect(() => {
    if (dataParams.cluster) {
      const plotEvent = startPendingEvent('plot:heatmap', window.SCP.getLogPlotProps())
      log('heatmap:initialize')
      morpheusHeatmap.current = renderHeatmap({
        target: `#${graphId}`,
        expressionValuesURL,
        annotationCellValuesURL,
        annotationName: dataParams.annotation.name,
        dimensionsFn,
        fit: renderParams.heatmapFit,
        rowCentering: dataParams.heatmapRowCentering
      })
      plotEvent.complete()
    }
  }, [
    studyAccession, genes.join(','),
    dataParams.cluster,
    dataParams.annotation.name,
    dataParams.annotation.scope,
    dataParams.heatmapRowCentering
  ])

  useUpdateEffect(() => {
    if (morpheusHeatmap.current && morpheusHeatmap.current.fitToWindow) {
      const fit = renderParams.heatmapFit
      morpheusHeatmap.current.fitToWindow({
        fitRows: fit === 'rows' || fit === 'both',
        fitColumns: fit === 'cols' || fit === 'both',
        repaint: true
      })
    }
  }, [renderParams.heatmapFit])

  return (
    <div className="plot">
      { dataParams.cluster &&
        <div id={graphId} className="heatmap-graph" style={{ minWidth: '80vw' }}></div> }
      { !dataParams.cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
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
