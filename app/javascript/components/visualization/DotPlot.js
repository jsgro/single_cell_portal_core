import React, { useState, useEffect } from 'react'
import _uniqueId from 'lodash/uniqueId'

import { log, startPendingEvent } from 'lib/metrics-api'
import { getColorBrewerColor } from 'lib/plot'
import DotPlotLegend from './DotPlotLegend'

export const dotPlotColorScheme = {
  // Blue, purple, red.  These red and blue hues are accessible, per WCAG.
  colors: ['#0000BB', '#CC0088', '#FF0000'],

  // TODO: Incorporate expression units, once such metadata is available.
  values: [0, 0.5, 1]
}

/** renders a morpheus powered dotPlot for the given URL paths and annotation */
export default function DotPlot({ expressionValuesURL, annotationCellValuesURL, annotation, annotationValues }) {
  const [graphId] = useState(_uniqueId('dotplot-'))
  useEffect(() => {
    const plotEvent = startPendingEvent('plot:dot', window.SCP.getLogPlotProps())
    log('dot-plot:initialize')
    renderDotPlot(
      `#${graphId}`,
      expressionValuesURL,
      annotationCellValuesURL,
      annotation,
      annotationValues,
      '',
      450
    )
    plotEvent.complete()
  }, [expressionValuesURL, annotationCellValuesURL, annotation.name, annotation.scope])
  return (
    <div>
      <div id={graphId} className="dotplot-graph"></div>
      <DotPlotLegend/>
    </div>
  )
}

/** Render Morpheus dot plot */
function renderDotPlot(target, dataPath, annotPath, annotation, annotationValues, fitType='', dotHeight=450) {
  const $target = $(target)
  $target.empty()

  // Collapse by mean
  const tools = [{
    name: 'Collapse',
    params: {
      collapse_method: 'Mean',
      shape: 'circle',
      collapse: ['Columns'],
      collapse_to_fields: [annotation.name],
      pass_expression: '>',
      pass_value: '0',
      percentile: '100',
      compute_percent: true
    }
  }]

  const config = {
    shape: 'circle',
    dataset: dataPath,
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
      add: (options) => {
        $target.empty()
        $target.append(options.$el)
        return {id: $target.attr('id'), $panel: $target}
      },
      setTabTitle: () => {},
      setActiveTab: () => {},
      getWidth: () => $target.width(),
      getHeight: () => $target.height(),
      getTabCount: () => 1
    },
    tools
  }

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
  if (annotPath !== '') {
    config.columnAnnotations = [{
      file: annotPath,
      datasetField: 'id',
      fileField: 'NAME',
      include: [annotation.name]
    }]
    config.columnSortBy = [
      { field: annotation.name, order: 0 }
    ]
    config.columns = [
      { field: annotation.name, display: 'text' }
    ]
    config.rows = [
      { field: 'id', display: 'text' }
    ]

    // Create mapping of selected annotations to colorBrewer colors
    const annotColorModel = {}
    annotColorModel[annotation.name] = {}
    const sortedAnnots = annotationValues.sort()

    // Calling % 27 will always return to the beginning of colorBrewerSet
    // once we use all 27 values
    $(sortedAnnots).each((index, annot) => {
      annotColorModel[annotation.name][annot] = getColorBrewerColor(index)
    })
    config.columnColorModel = annotColorModel
  }

  config.colorScheme = dotPlotColorScheme

  // Instantiate dot plot and embed in DOM element
  new window.morpheus.HeatMap(config)
}
