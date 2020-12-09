import $ from 'jquery'
import Plotly from 'plotly.js-dist'

import { labelFont, getColorBrewerColor } from 'lib/plot'
import { fetchCluster } from 'lib/scp-api'
import { getMainViewOptions } from 'lib/study-overview/view-options'

/** Resize Plotly scatter plots -- done on window resize  */
export function resizeScatterPlots() {
  const plots = window.SCP.scatterPlots

  for (let i = 0; i < plots.length; i++) {
    const rawPlot = plots[i]
    const layout = getScatterPlotLayout(rawPlot)
    const target = rawPlot.plotId
    Plotly.relayout(target, layout)
  }
}

/** Change Plotly scatter plot color scales */
export function setScatterPlotColorScales(theme) {
  const plots = window.SCP.scatterPlots

  for (let i = 0; i < plots.length; i++) {
    const rawPlot = plots[i]
    const target = rawPlot.plotId
    const dataUpdate = { 'marker.colorscale': theme }
    Plotly.update(target, dataUpdate)
  }
}

/** Get Plotly layout object for scatter plot */
export function getBaseLayout(height, width) {
  const font = labelFont

  const layout = {
    hovermode: 'closest',
    margin: {
      t: 25,
      r: 0,
      b: 20,
      l: 0
    },
    height,
    width,
    font
  }
  return layout
}

/** Gets Plotly layout scene props for 3D scatter plot */
export function get3DScatterProps(camera, cluster) {
  const { domainRanges, axes } = cluster
  const { titles, ranges, aspects } = axes

  const scene = {
    camera,
    aspectmode: 'cube',
    xaxis: { title: titles.x, autorange: true, showticklabels: false },
    yaxis: { title: titles.y, autorange: true, showticklabels: false },
    zaxis: { title: titles.z, autorange: true, showticklabels: false }
  }

  if (domainRanges) {
    scene.xaxis.autorange = false
    scene.xaxis.range = ranges.x
    scene.yaxis.autorange = false
    scene.yaxis.range = ranges.y
    scene.zaxis.autorange = false
    scene.zaxis.range = ranges.x
    scene.aspectmode = aspects.mode,
    scene.aspectratio = {
      x: aspects.x,
      y: aspects.y,
      z: aspects.z
    }
  }

  return scene
}

/** Gets Plotly layout props for 2D scatter plot */
export function get2DScatterProps(cluster) {
  const {
    axes, domainRanges, hasCoordinateLabels, coordinateLabels
  } = cluster
  const { titles } = axes

  const layout = {
    xaxis: { title: titles.x, showticklabels: false },
    yaxis: { title: titles.y, showticklabels: false, scaleanchor: 'x' }
  }

  // if user has supplied a range, set that, otherwise let Plotly autorange
  if (domainRanges) {
    layout.xaxis.range = domainRanges.x
    layout.yaxis.range = domainRanges.y
  } else {
    layout.xaxis.autorange = true
    layout.yaxis.autorange = true
  }

  if (hasCoordinateLabels) {
    layout.annotations = coordinateLabels
  }

  return layout
}

/** Set colors for group-based annotations */
export function setMarkerColors(data) {
  return data.map((trace, i) => {
    trace.marker.color = getColorBrewerColor(i)
    return trace
  })
}

/** Get height and width for a to-be-rendered cluster plot */
function calculatePlotRect(numRows, numColumns) {
  // console.log('numRows')
  // console.log(numRows)
  // console.log('numColumns')
  // console.log(numColumns)
  // Get height
  const $ideo = $('#_ideogram')
  const ideogramHeight = $ideo.length ? $ideo.height() : 0
  const verticalPad = 225 // Accounts for page header, search area, nav tabs
  let height = $(window).height() - verticalPad - ideogramHeight
  if (numRows > 1) {height = height/numRows - 10}

  // Get width, and account for expanding "View options" after page load
  const baseWidth = $('#render-target .tab-content').actual('width')
  const horizontalPad = 80 // Accounts for empty space to left and right
  let width = (baseWidth - horizontalPad) / numColumns

  // Ensure plots aren't too small
  if (height < 100) {height = 100}
  if (width < 100) {width = 100}

  return { height, width }
}

/** Get layout object with various Plotly scatter plot display parameters */
function getScatterPlotLayout(rawPlot) {
  const { numRows, numColumns } = rawPlot
  const { height, width } = calculatePlotRect(numRows, numColumns)
  let layout = getBaseLayout(height, width)

  let dimensionProps
  if (rawPlot.is3D) {
    const camera = $('#cluster-plot').data('camera')
    dimensionProps = get3DScatterProps(camera, rawPlot)
    layout.scene = dimensionProps
  } else {
    dimensionProps = get2DScatterProps(rawPlot)
    layout = Object.assign(layout, dimensionProps)
  }

  return layout
}

/** Renders a Plotly scatter plot for "Clusters" tab */
function renderScatterPlot(rawPlot, plotId, legendId) {
  let { data } = rawPlot

  const layout = getScatterPlotLayout(rawPlot)

  if (rawPlot.annotParams.type === 'group' && !rawPlot.gene) {
    data = setMarkerColors(data)
  }

  $(`#${plotId}`).html()

  Plotly.newPlot(plotId, data, layout)

  if (legendId) {
    $(`#${legendId}`).html(
      `<p class="text-center help-block">${rawPlot.description}</p>`
    )
  }

  // access actual target div, not jQuery object wrapper for relayout event
  const scatterPlotDiv = document.getElementById(plotId)
  scatterPlotDiv.on('plotly_relayout', cameraData => {
    if (typeof cameraData['scene.camera'] !== 'undefined') {
      const newCamera = cameraData['scene.camera']
      $(`#${plotId}`).data('camera', newCamera)
    }
  })
}

/**
 * Load and draw scatter plot.  Handles clusters and spatial groups, numeric
 * and group annotations.
 *
 * @param {Object} clusterParams Parameters for `/clusters` plot API endpoint
 * @param {Object} frame Plot UI properties not from plot API data
 */
export async function scatterPlot(clusterParams, frame) {
  // Copy by value; preserves properties (e.g. plotId) across `await`
  frame = Object.assign({}, frame)

  const { plotId, hasLegend } = frame
  console.log(plotId)

  const legendId = (hasLegend ? `${plotId}-legend` : null)
  const legendHtml = (hasLegend ? `<div id="${legendId}"></div>` : '')

  $(frame.selector).append(
    `<div id="${plotId}" class="plot"></div>
      ${legendHtml}
    </div>`
  )

  // Set default number of rows and columns of plots
  if (!frame.numRows) {frame.numRows = 1}
  if (!frame.numColumns) {frame.numColumns = 1}

  const $plotElement = $(`#${plotId}`)
  const spinnerTarget = $plotElement[0]
  const spinner = new Spinner(window.opts).spin(spinnerTarget)
  // $plotElement.data('spinner', spinner)

  const { accession, cluster, annotation, subsample, gene } = clusterParams
  let isAnnotatedScatter = null
  if (
    'isAnnotatedScatter' in clusterParams && clusterParams.isAnnotatedScatter
  ) {
    isAnnotatedScatter = true
  }

  $('#search_annotation').val(annotation)
  $('#gene_set_annotation').val(annotation)

  let rawPlot = await fetchCluster(
    accession, cluster, annotation, subsample, null, gene, isAnnotatedScatter
  )
  rawPlot = Object.assign(rawPlot, frame)

  // Consider putting into a dictionary instead of a list
  window.SCP.scatterPlots.push(rawPlot)

  // render annotation toggler picker if needed
  if (rawPlot.annotParams.type == 'numeric') {
    $('#toggle-plots').html('')
  } else {
    // Consider restoring this; it was missing on production before refactor
    // $('#toggle-plots').html(
    //   '<a href="#" class="btn btn-default btn-sm" id="toggle-traces" ' +
    //     'data-toggle="tooltip" data-placement="left" data-trigger="hover" ' +
    //     'title="Click to toggle all annotations, or toggle individual ' +
    //       'annotations by clicking the legend entry"' +
    //   '>Toggle Annotations <i class="fas fa-toggle-on"></i></a>'
    // )
    // $('#toggle-traces').tooltip({
    //   container: 'body', placement: 'left', trigger: 'hover'
    // })
  }

  renderScatterPlot(rawPlot, plotId, legendId)

  spinner.stop()
}

/**
 * Load and draw scatter plots for reference clusters, gene + ref clusters
 *
 * @param {Object} study Study object returned by clusters API endpoint
 * @param {String} gene Searched gene name, e.g. "TP53"
 * @param {Boolean} hasReference Whether each plot has a paired reference
 */
export async function scatterPlots(study, gene=null, hasReference=false) {
  const $container = $('#scatter-plots .panel-body')
  $container.html('<div class="row multiplot"></div>')
  if (hasReference) {$container.append('<div class="row multiplot"></div>')}

  const accession = study.accession

  // Plot UI properties that are distinct from fetched scatter plot data
  const frame = {
    numRows: (hasReference ? 2 : 1),
    numColumns: (study.spatialGroupNames.length > 0) ? 2 : 1
  }

  for (let plotIndex = 0; plotIndex < frame.numColumns; plotIndex++) {
    const options = getMainViewOptions(plotIndex)
    const clusterParams = Object.assign({ accession, gene }, options)

    frame.selector = `.multiplot:nth-child(1)`
    frame.hasLegend = true
    frame.plotId = `scatter-plot-${plotIndex}`

    scatterPlot(clusterParams, frame)

    if (hasReference) {
      clusterParams.gene = null
      frame.selector = `.multiplot:nth-child(2)`
      frame.hasLegend = false
      frame.plotId += '-reference'
      scatterPlot(clusterParams, frame)
    }
  }
}
