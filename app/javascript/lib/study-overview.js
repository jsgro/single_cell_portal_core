/**
* @fileoverview Study Overview user interface
*
* The Explore tab in Study Overview has three main views:
*   - Default: Shows "Clusters" and sometimes "Genomes", etc.
*   - Single-gene: Shows distribution (violin or box) plot and others
*   - Multiple-gene: Shows dot plot and heatmap
*/

/**
 * TODO (SCP-2884): Move code for default Explore view into separate module
 */
import $ from 'jquery'
import Plotly from 'plotly.js-dist'
import { labelFont, getColorBrewerColor } from 'lib/plot'
import { fetchExplore, fetchCluster } from 'lib/scp-api'

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

/** Get height and width for a to-be-rendered cluster plot */
function calculatePlotRect() {
  const numPlots = window.SCP.numPlots

  const height = $(window).height() - 250

  // Accounts for expanding "View options" after page load
  let baseWidth = $('#plots-tab').width()

  // Accounts for when "Summary" tab is selected by default
  if (baseWidth === 0) baseWidth = $(window).width()

  const width = (baseWidth - 80) / numPlots

  return { height, width }
}


/** Resize Plotly scatter plots -- done on window resize  */
function resizePlots() {
  const numPlots = window.SCP.numPlots

  for (let i = 0; i < numPlots; i++) {
    const rawPlot = window.SCP.plots[i]
    const layout = getScatterPlotLayout(rawPlot)
    const target = `cluster-plot-${i}`

    Plotly.relayout(target, layout)
  }
}

/** Change Plotly scatter plot color scales */
function setColorScales(theme) {
  const numPlots = window.SCP.numPlots

  for (let i = 0; i < numPlots; i++) {
    const target = `cluster-plot-${i}`
    const dataUpdate = { 'marker.colorscale': theme }
    Plotly.update(target, dataUpdate)
  }
}
/** Set colors for group-based annotations */
export function setMarkerColors(data) {
  return data.map((trace, i) => {
    trace.marker.color = getColorBrewerColor(i)
    return trace
  })
}


/** Renders a Plotly scatter plot for "Clusters" tab */
function renderScatterPlot(rawPlot, plotId, legendId) {
  let { data } = rawPlot

  const layout = getScatterPlotLayout(rawPlot)

  if (rawPlot.annotParams.type === 'group') {
    data = setMarkerColors(data)
  }

  Plotly.newPlot(plotId, data, layout)

  $(`#${legendId}`).html(
    `<p class="text-center help-block">${rawPlot.description}</p>`
  )

  // access actual target div, not jQuery object wrapper for relayout event
  const clusterPlotDiv = document.getElementById(plotId)
  clusterPlotDiv.on('plotly_relayout', cameraData => {
    if (typeof cameraData['scene.camera'] !== 'undefined') {
      const newCamera = cameraData['scene.camera']
      $(`#${plotId}`).data('camera', newCamera)
    }
  })
}

/** draws scatter plot */
async function drawScatterPlot(accession, cluster, plotIndex) {
  const plotId = `cluster-plot-${plotIndex}`
  const legendId = `cluster-legend-${plotIndex}`

  let plotClass = '' // For only 1 plot (study without spatial data)
  if (window.SCP.numPlots > 1) {
    plotClass = ' plot-left'
    if (plotIndex !== 0) {
      plotClass = ' plot-right'
    }
  }

  $('#plots .panel-body').append(`
    <div class="row${plotClass}">
      <div id="${plotId}"></div>
      <div id="${legendId}"></div>
    </div>`)

  const plotJqDom = $(`#${plotId}`)
  const spinnerTarget = plotJqDom[0]
  const spinner = new Spinner(window.opts).spin(spinnerTarget)
  plotJqDom.data('spinner', spinner)

  const annotation = $('#annotation').val()
  const subsample = $('#subsample').val()

  $('#search_annotation').val(annotation)
  $('#gene_set_annotation').val(annotation)

  const rawPlot = await fetchCluster(
    accession, cluster, annotation, subsample
  )

  window.SCP.cluster = rawPlot

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

  // Duplicate calls are merely for proof-of-concept, showing we can
  // render plots side-by-side
  renderScatterPlot(rawPlot, plotId, legendId)

  plotJqDom.data('spinner').stop()
  plotJqDom.find('.spinner').remove()
}

/** Fetch and draw scatter plot for default Explore tab view */
async function drawScatterPlots(study) {
  let cluster

  window.SCP.numPlots = (study.spatialGroupNames.length > 0) ? 2 : 1

  for (let plotIndex = 0; plotIndex < window.SCP.numPlots; plotIndex++) {
    if (plotIndex === 0) {
      cluster = $('#cluster').val()
    } else {
      cluster = $('#spatial-group').val()
    }

    drawScatterPlot(study.accession, cluster, plotIndex)
  }
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

/**
 * End default Explore view code
 */

/** Listen for events, and update view accordingly */
function attachEventHandlers(study) {
  // For inferCNV ideogram
  $('#ideogram_annotation').on('change', function() {
    const ideogramFiles = window.SCP.study.inferCNVIdeogramFiles
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
    drawScatterPlots(study)
  })

  $('#subsample').change(function() {
    $('#cluster-plot').data('rendered', false)
    const subsample = $(this).val() // eslint-disable-line
    $('#search_subsample').val(subsample)
    $('#gene_set_subsample').val(subsample)
    drawScatterPlots(study)
  })

  $('#cluster').change(function() {
    $('#cluster-plot').data('rendered', false)
    const newCluster = $(this).val() // eslint-disable-line
    // keep track for search purposes
    $('#search_cluster').val(newCluster)
    $('#gene_set_cluster').val(newCluster)
    drawScatterPlots(study)
  })

  $(document).on('change', '#spatial-group', function() {
    $('#cluster-plot').data('rendered', false)
    const newSpatial = $(this).val() // eslint-disable-line
    // keep track for search purposes
    $('#search_spatial-group').val(newSpatial)
    $('#gene_set_spatial-group').val(newSpatial)
    drawScatterPlots(study)
  })

  // listener to redraw expression scatter with new color profile
  $('#colorscale').change(function() {
    const theme = $(this).val() // eslint-disable-line
    // $('#search_colorscale').val(theme)
    setColorScales(theme)
  })
}

/** Get HTML for dropdown menu for spatial files */
function getSpatialDropdown(study) {
  const options = study.spatialGroupNames.map(name => {
    return `<option value="${name}">${name}</option>`
  })
  const domId = 'spatial-group'
  const select =
    `<select name="${domId}" id="${domId}" class="form-control">${
      options
    }</select>`
  return (
    `<div class="form-group col-sm-4">` +
    `<label for=${domId}>Spatial group</label><br/>${select}` +
    `</div>`
  )
}

/** Add dropdown menu for spatial files */
function addSpatialDropdown(study) {
  if (study.spatialGroupNames.length > 0) {
    const dropdown = getSpatialDropdown(study)
    $('#view-options #precomputed-panel #precomputed .row').append(dropdown)
  }
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

  // TODO (SCP-2884): Declare this outside the function, if reasonable
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

  const accession = window.SCP.studyAccession
  const study = await fetchExplore(accession)

  window.SCP.study = study
  window.SCP.study.accession = accession
  window.SCP.taxons = window.SCP.study.taxonNames

  attachEventHandlers(study)

  if (study.cluster) {
    // set default subsample option of 10K (if subsampled) or all cells
    if (study.cluster.numPoints > 10000 && study.cluster.isSubsampled) {
      $('#subsample').val(10000)
      $('#search_subsample').val(10000)
    }

    addSpatialDropdown(study)

    drawScatterPlots(study)
  }

  if (study.inferCNVIdeogramFiles) {
    // user has no clusters, but does have ideogram annotations

    const ideogramSelect = $('#ideogram_annotation')
    const firstIdeogram = $('#ideogram_annotation option')[1].value

    // manually trigger change to cause ideogram to render
    ideogramSelect.val(firstIdeogram).trigger('change')
  }
}
