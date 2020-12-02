import $ from 'jquery'
import Plotly from 'plotly.js-dist'

import { labelFont, getColorBrewerColor } from 'lib/plot'
import { fetchCluster } from 'lib/scp-api'
import { getMainViewOptions } from 'lib/study-overview/view-options'

/** Get DOM ID of scatter plot at given index */
function getScatterPlotId(plotIndex) {
  return `scatter-plot-${plotIndex}`
}

/** Resize Plotly scatter plots -- done on window resize  */
export function resizePlots() {
  const numPlots = window.SCP.numPlots

  for (let i = 0; i < numPlots; i++) {
    const rawPlot = window.SCP.plots[i]
    const layout = getScatterPlotLayout(rawPlot)
    const target = getScatterPlotId(i)

    Plotly.relayout(target, layout)
  }
}

/** Change Plotly scatter plot color scales */
export function setColorScales(theme) {
  const numPlots = window.SCP.numPlots

  for (let i = 0; i < numPlots; i++) {
    const target = getScatterPlotId(i)
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
function calculatePlotRect() {
  const numPlots = window.SCP.numPlots

  const height = $(window).height() - 250

  // Accounts for expanding "View options" after page load
  const baseWidth = $('#plots-tab').actual('width')

  const gutterPad = 80 // Accounts for horizontal padding
  const width = (baseWidth - gutterPad) / numPlots

  return { height, width }
}

/** Get layout object with various Plotly scatter plot display parameters */
function getScatterPlotLayout(rawPlot) {
  const { height, width } = calculatePlotRect()
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

  if (rawPlot.annotParams.type === 'group') {
    data = setMarkerColors(data)
  }

  Plotly.newPlot(plotId, data, layout)

  if (legendId) {
    $(`#${legendId}`).html(
      `<p class="text-center help-block">${rawPlot.description}</p>`
    )
  }

  // access actual target div, not jQuery object wrapper for relayout event
  const clusterPlotDiv = document.getElementById(plotId)
  clusterPlotDiv.on('plotly_relayout', cameraData => {
    if (typeof cameraData['scene.camera'] !== 'undefined') {
      const newCamera = cameraData['scene.camera']
      $(`#${plotId}`).data('camera', newCamera)
    }
  })
}

/** Load and draw scatter plot; handles clusters and spatial groups */
async function scatterPlot(
  accession, plotIndex, options, hasLegend=true, gene=null
) {
  // Consider avoiding parallel indexes like this in React refactor
  const plotId = `scatter-plot-${plotIndex}`

  const legendId = (hasLegend ? `scatter-legend-${plotIndex}` : null)
  const legendHtml = (hasLegend ? `<div id="${legendId}"></div>` : '')

  $('#scatter-plots .panel-body').append(`
    <div class="row dual-plot">
      <div id="${plotId}"></div>
      ${legendHtml}
    </div>`)

  const $plotElement = $(`#${plotId}`)
  const spinnerTarget = $plotElement[0]
  const spinner = new Spinner(window.opts).spin(spinnerTarget)
  $plotElement.data('spinner', spinner)

  const { cluster, annotation, subsample } = options

  $('#search_annotation').val(annotation)
  $('#gene_set_annotation').val(annotation)

  const rawPlot = await fetchCluster(
    accession, cluster, annotation, subsample, null, gene
  )

  // Consider putting into a dictionary instead of a list
  window.SCP.plots.push(rawPlot)

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

  $plotElement.data('spinner').stop()
  $plotElement.find('.spinner').remove()
}

/** Load and draw scatter plots for default Explore tab view */
export async function scatterPlots(study, gene=null) {
  window.SCP.numPlots = (study.spatialGroupNames.length > 0) ? 2 : 1

  for (let plotIndex = 0; plotIndex < window.SCP.numPlots; plotIndex++) {
    const options = getMainViewOptions(plotIndex)
    scatterPlot(study.accession, plotIndex, options, true, gene)
  }
}
