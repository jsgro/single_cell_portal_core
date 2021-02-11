import React, { useState, useEffect } from 'react'
import _uniqueId from 'lodash/uniqueId'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import { log, startPendingEvent } from 'lib/metrics-api'
import { getExpressionHeatmapURL, getAnnotationCellValuesURL } from 'lib/scp-api'
import { morpheusTabManager } from './DotPlot'

export const ROW_CENTERING_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Z-score [(v - mean) / stdev]', value: 'z-score' },
  { label: 'Robust z-score [(v - median) / MAD]', value: 'robust z-score' }
]

export const DEFAULT_ROW_CENTERING = ''


/** renders a morpheus powered heatmap for the given params */
export default function Heatmap({ studyAccession, genes, dataParams, renderParams, dimensionsFn }) {
  const [graphId] = useState(_uniqueId('heatmap-'))
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
      renderHeatmap({
        target: `#${graphId}`,
        expressionValuesURL,
        annotationCellValuesURL,
        annotationName: dataParams.annotation.name,
        dimensionsFn
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
  return (
    <div className="plot">
      { dataParams.cluster &&
        <div id={graphId} className="heatmap-graph" style={{ minWidth: '80vw' }}></div> }
      { !dataParams.cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
    </div>
  )
}

/** Render Morpheus heatmap */
function renderHeatmap({ target, expressionValuesURL, annotationCellValuesURL, annotationName, dimensionsFn }) {
  const $target = $(target)
  $target.empty()

  const heatmap_row_centering = ''
  var colorScalingMode = 'relative';
  // determine whether to scale row colors globally or by row
  if (heatmap_row_centering !== '') {
      colorScalingMode = 'fixed';
  }

  const config = {
    dataset: expressionValuesURL,
    el: $target,
    menu: null,
    colorScheme: {
      scalingMode: 'relative'
    },
    focus: null,
    // We implement our own trivial tab manager as it seems to be the only way
    // (after 2+ hours of digging) to prevent morpheus auto-scrolling
    // to the heatmap once it's rendered
    tabManager: morpheusTabManager($target, dimensionsFn)
  }
  // pull fit type as well, defaults to ''
  const fitType = ''
  // Fit rows, columns, or both to screen
  if (fitType === 'cols') {
    config.columnSize = 'fit'
  } else if (fitType === 'rows') {
    config.rowSize = 'fit'
  } else if (fitType === 'both') {
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

  new window.morpheus.HeatMap(config)
}
