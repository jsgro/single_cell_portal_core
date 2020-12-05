import React, { useRef, useState, useEffect } from 'react'
import _uniqueId from 'lodash/uniqueId'

export const dotPlotColorScheme = {
  // Blue, purple, red.  These red and blue hues are accessible, per WCAG.
  colors: ['#0000BB', '#CC0088', '#FF0000'],

  // TODO: Incorporate expression units, once such metadata is available.
  values: [0, 0.5, 1]
}

export default function DotPlot({expressionValuesURL, annotationCellValuesURL, annotation}) {
  const [graphId, setGraphId] = useState(_uniqueId('dotPlot-'))
  useEffect(() => {
    const plotEvent = startPendingEvent('plot:dot', window.SCP.getLogPlotProps())
    log('dot-plot:initialize')
    renderDotPlot(
      graphId,
      expressionValuesURL,
      annotationCellValuesURL,
      annotation,
      '',
      450,
      `#expGraph${study.accession}-legend`
    )
    plotEvent.complete()
  }, [expressionValuesURL, annotationCellValuesURL, annotation.name, annotation.scope])
  return (
    <div>
      <div id={graphId} class="dotplot-graph"></div>
      <DotPlotLegend/>
    </div>
  )
}


/** Render Morpheus dot plot */
function renderDotPlot(target, dataPath, annotPath, annotation, dotHeight=450, fitType='') {

  $(target).empty()

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
    el: $(target),
    menu: null,
    colorScheme: {
      scalingMode: 'relative'
    },
    tools
  }

  // Set height if specified, otherwise use default setting of 500 px
  if (dotHeight !== undefined) {
    config.height = dotHeight
  } else {
    config.height = 500
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
      include: [selectedAnnot]
    }]
    config.columnSortBy = [
      { field: selectedAnnot, order: 0 }
    ]
    config.columns = [
      { field: selectedAnnot, display: 'text' }
    ]
    config.rows = [
      { field: 'id', display: 'text' }
    ]

    // Create mapping of selected annotations to colorBrewer colors
    const annotColorModel = {}
    annotColorModel[selectedAnnot] = {}
    const sortedAnnots = annotation['values'].sort()

    // Calling % 27 will always return to the beginning of colorBrewerSet
    // once we use all 27 values
    $(sortedAnnots).each((index, annot) => {
      annotColorModel[selectedAnnot][annot] = colorBrewerSet[index % 27]
    })
    config.columnColorModel = annotColorModel
  }

  config.colorScheme = dotPlotColorScheme

  // Instantiate dot plot and embed in DOM element
  let dotPlot = new window.morpheus.HeatMap(config)
}
