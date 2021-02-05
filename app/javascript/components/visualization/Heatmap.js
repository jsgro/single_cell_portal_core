import React, { useState, useEffect } from 'react'
import _uniqueId from 'lodash/uniqueId'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import { log, startPendingEvent } from 'lib/metrics-api'
import { getExpressionHeatmapURL, getAnnotationCellValuesURL } from 'lib/scp-api'

/** renders a morpheus powered heatmap for the given params */
export default function Heatmap({ studyAccession, genes, dataParams }) {
  const [graphId] = useState(_uniqueId('heatmap-'))
  const expressionValuesURL = getExpressionHeatmapURL(studyAccession, genes, dataParams.cluster)
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
        expressionValuesURL: expressionValuesURL,
        annotationCellValuesURL: annotationCellValuesURL,
        annotationName: dataParams.annotation.name
      })
      plotEvent.complete()
    }
  }, [
    studyAccession, genes.join(','),
    dataParams.cluster,
    dataParams.annotation.name,
    dataParams.annotation.scope
  ])
  return (
    <div>
      { dataParams.cluster &&
        <div id={graphId} className="heatmap-graph"></div> }
      { !dataParams.cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
    </div>
  )
}

/** Render Morpheus heatmap */
function renderHeatmap({ target, expressionValuesURL, annotationCellValuesURL, annotationName }) {
  const $target = $(target)
  $target.empty()
  // TODO -- add to viewOptions
  const heatmap_row_centering = ''

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
    tabManager: {
      add: options => {
        $target.empty()
        $target.append(options.$el)
        return { id: $target.attr('id'), $panel: $target }
      },
      setTabTitle: () => {},
      setActiveTab: () => {},
      getWidth: () => $target.width(),
      getHeight: () => $target.height(),
      getTabCount: () => 1
    }
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
