/**
* @fileoverview Default view of Explore tab in Study Overview
*
* Shows "Clusters" and sometimes "Genomes", etc.
*/

/**
 * Render cluster code
 *
 * TODO: Move this to render-cluster.js, or some such
 */
import $ from 'jquery'
import Plotly from 'plotly.js-dist'
import { labelFont } from 'lib/plot'
import { fetchExploreInitialization, fetchScatter } from 'lib/scp-api'

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
  const { clusterHasRange, axes } = cluster
  const { titles, ranges, aspects } = axes

  const scene = {
    camera,
    aspectmode: 'cube',
    xaxis: { title: titles.x, autorange: true, showticklabels: false },
    yaxis: { title: titles.y, autorange: true, showticklabels: false },
    zaxis: { title: titles.z, autorange: true, showticklabels: false }
  }

  if (clusterHasRange) {
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
    axes, clusterHasRange, domainRanges, hasCoordinateLabels, coordinateLabels
  } = cluster
  const { titles } = axes

  const layout = {
    xaxis: { title: titles.x, showticklabels: false },
    yaxis: { title: titles.y, showticklabels: false, scaleanchor: 'x' }
  }

  // if user has supplied a range, set that, otherwise let Plotly autorange
  if (clusterHasRange) {
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

/** Get height and width for a to-be-rendered cluster plot */
function calculatePlotRect() {
  const numPlots = window.SCP.numPlots

  const height = $(window).height() - 250
  const width = ($('#plots-tab').width() - 80) / numPlots

  return { height, width }
}


/** Resize Plotly scatter plots -- done on window resize  */
function resizePlots() {
  const numPlots = window.SCP.numPlots

  for (let i = 0; i < numPlots; i++) {
    const rawPlot = window.SCP.plots[i]
    const layout = getScatterPlotLayout(rawPlot)
    const target = `cluster-plot-${i + 1}`

    Plotly.relayout(target, layout)
  }
}


/** Renders Plotly scatter plot for "Clusters" tab */
function renderScatterPlot(target, rawPlot) {
  const { data } = rawPlot

  window.SCP.scatterCount += 1
  const scatterCount = window.SCP.scatterCount

  const plotId = `cluster-plot-${scatterCount}`

  $(target).append(`
    <div class="row" style="float: left">
      <div id="${plotId}"></div>
      <div id="cluster-figure-legend"></div>
    </div>`)

  const layout = getScatterPlotLayout(rawPlot)

  Plotly.newPlot(plotId, data, layout)

  // listener to redraw expression scatter with new color profile
  $('#colorscale').off('change')
  $('#colorscale').change(function() {
    const theme = $(this).val() // eslint-disable-line
    data[0].marker.colorscale = theme
    console.log(`setting colorscale to ${theme}`)

    $('#search_colorscale').val(theme)
    Plotly.update(plotId, data, layout)
  })

  const description =
    `<p class="text-center help-block">${window.SCP.cluster.description}</p>`
  $('#cluster-figure-legend').html(description)

  // access actual target div, not jQuery object wrapper for relayout event
  const clusterPlotDiv = document.getElementById(plotId)
  clusterPlotDiv.on('plotly_relayout', cameraData => {
    if (typeof cameraData['scene.camera'] !== 'undefined') {
      const newCamera = cameraData['scene.camera']
      $(`#${plotId}`).data('camera', newCamera)
    }
  })

  window.SCP.scatterPlotLayout = layout
}

/**
 * End render cluster code
 */

/** Fetch and draw scatter plot for default Explore tab view */
async function drawScatterPlot() {
  const spinnerTarget = $('#plots')[0]
  const spinner = new Spinner(window.opts).spin(spinnerTarget)
  $('#plots').data('spinner', spinner)

  const cluster = $('#cluster').val()
  const annotation = $('#annotation').val()
  const subsample = $('#subsample').val()

  const rawScatter = await fetchScatter(
    window.SCP.study.accession, cluster, annotation, subsample
  )

  window.SCP.cluster = rawScatter

  // Consider putting into a dictionary instead of a list
  window.SCP.plots.push(rawScatter)

  // TODO (SCP-2857): Remove hard-coding when UI for selecting n-many cluster
  // + spatial plots is something we can develop against.
  window.SCP.numPlots = 1

  // Incremented upon drawing scatter plot; enables unique plot IDs
  window.SCP.scatterCount = 0

  // render colorscale picker if needed
  if (rawScatter.annotParams.type == 'numeric') {
    $('#toggle-plots').html('')
  } else {
    $('#toggle-plots').html(
      '<a href="#" class="btn btn-default btn-sm" id="toggle-traces" ' +
          'data-toggle="tooltip" data-placement="left" data-trigger="hover" ' +
          'title="Click to toggle all annotations, or toggle individual ' +
            'annotations by clicking the legend entry"' +
        '>Toggle Annotations <i class="fas fa-toggle-on"></i></a>'
    )
    $('#toggle-traces').tooltip({
      container: 'body', placement: 'left', trigger: 'hover'
    })
  }

  const target = '#plots .panel-body'

  // Duplicate calls are merely for proof-of-concept, showing we can
  // render plots side-by-side
  renderScatterPlot(target, rawScatter)

  $('#plots').data('spinner').stop()

  $('#search_annotation').val(annotation)
  $('#gene_set_annotation').val(annotation)
}

/** Get layout object with various Plotly scatter plot display parameters */
function getScatterPlotLayout(rawPlot) {
  const { height, width } = calculatePlotRect()
  let layout = getBaseLayout(height, width)

  let dimensionProps
  if (rawPlot.is3D) {
    const camera = $('#cluster-plot').data('camera')
    dimensionProps = get3DScatterProps(camera, window.SCP.cluster)
  } else {
    dimensionProps = get2DScatterProps(window.SCP.cluster)
  }

  layout = Object.assign(layout, dimensionProps)

  return layout
}

function attachEventHandlers() {
  // For inferCNV ideogram
  $('#ideogram_annotation').on('change', function() {
    const ideogramFiles = window.SCP.study.ideogramFiles
    const fileId = $(this).val() // eslint-disable-line
    if (fileId !== '') {
      const ideogramAnnot = ideogramFiles[fileId]
      window.ideogramInferCnvSettings = ideogramAnnot.ideogram_settings
      window.initializeIdeogram(ideogramAnnot.ideogram_settings.annotationsPath)
    } else {
      $('#tracks-to-display, #_ideogramOuterWrap').html('')
      $('#ideogramTitle').remove()
    }
  })

  // resize listener
  $(window).on('resizeEnd', () => {resizePlots()})

  // listener for cluster nav, specific to study page
  $('#annotation').change(function() {
    $('#cluster-plot').data('rendered', false)
    const an = $(this).val() // eslint-disable-line
    // keep track for search purposes
    $('#search_annotation').val(an)
    $('#gene_set_annotation').val(an)
    drawScatterPlot()
  })

  $('#subsample').change(function() {
    $('#cluster-plot').data('rendered', false)
    const subsample = $(this).val() // eslint-disable-line
    $('#search_subsample').val(subsample)
    $('#gene_set_subsample').val(subsample)
    drawScatterPlot()
  })

  $('#cluster').change(function() {
    $('#cluster-plot').data('rendered', false)
    const newCluster = $(this).val() // eslint-disable-line
    // keep track for search purposes
    $('#search_cluster').val(newCluster)
    $('#gene_set_cluster').val(newCluster)
    drawScatterPlot()
  })
}

/** Initialize the "Explore" tab in Study Overview */
export default async function initializeExplore() {
  window.SCP.study = {}
  window.SCP.plots = []
  window.SCP.plotRects = []

  window.SCP.startPendingEvent('user-action:page:view:site-study',
    { speciesList: window.SCP.taxons },
    'plot:',
    true)

  $('#cluster-plot').data('rendered', false)

  const baseCamera = {
    'up': { 'x': 0, 'y': 0, 'z': 1 },
    'center': { 'x': 0, 'y': 0, 'z': 0 },
    'eye': { 'x': 1.25, 'y': 1.25, 'z': 1.25 }
  }

  // if tab position was specified in url, show the current tab
  if (window.location.href.split('#')[1] !== '') {
    const tab = window.location.href.split('#')[1]
    $(`#study-tabs a[href="#${tab}"]`).tab('show')
  }
  $('#cluster-plot').data('camera', baseCamera)
  // set default subsample option of 10K (if subsampled) or all cells
  if (window.SCP.numPointsCluster > 10000 && window.SCP.clusterIsSampled) {
    $('#subsample').val(10000)
    $('#search_subsample').val(10000)
  }

  attachEventHandlers();

  const accession = window.SCP.studyAccession
  window.SCP.study = await fetchExploreInitialization(accession)
  window.SCP.study.accession = accession

  window.SCP.taxons = window.SCP.study.taxonNames

  drawScatterPlot()

  if (window.SCP.hasIdeogramInferCnvFiles) {
    // user has no clusters, but does have ideogram annotations

    const ideogramSelect = $('#ideogram_annotation')
    const firstIdeogram = $('#ideogram_annotation option')[1].value

    // manually trigger change to cause ideogram to render
    ideogramSelect.val(firstIdeogram).trigger('change')
  }
}
