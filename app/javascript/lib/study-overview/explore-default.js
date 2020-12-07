/**
* @fileoverview Single-gene view in "Explore" tab of Study Overview page
*
* The Explore tab has three views:
*   - Default: Shows "Clusters" and sometimes "Genomes", etc.
*   - Single-gene: Shows distribution (violin or box) plot and others
*   - Multiple-genes: Shows dot plot and heatmap
*/

import { fetchExplore } from 'lib/scp-api'
import { scatterPlots, resizePlots, setColorScales } from 'lib/scatter-plot'
import {
  addSpatialDropdown, updateCluster
} from 'lib/study-overview/view-options'

const baseCamera = {
  'up': { 'x': 0, 'y': 0, 'z': 1 },
  'center': { 'x': 0, 'y': 0, 'z': 0 },
  'eye': { 'x': 1.25, 'y': 1.25, 'z': 1.25 }
}

/** Listen for events, and update view accordingly */
function attachEventHandlers(study) {
  console.log('in attachEventHandlers for explore-default')
  // resize listener
  $(window).off('resizeEnd') // Clear any existing handler
  $(window).on('resizeEnd', () => {resizePlots()})


  $(document).off('change', '#cluster')
  $(document).on('change', '#cluster', function() {
    const cluster = $(this).val() // eslint-disable-line
    const subsample = $('#subsample').val()
    // keep track for search purposes
    $('#search_cluster').val(cluster)
    $('#gene_set_cluster').val(cluster)
    const url =
    `${window.location.pathname}/get_new_annotations` +
    `?cluster=${encodeURIComponent(cluster)}&` +
    `subsample=${encodeURIComponent(subsample)}`
    $.ajax({
      url,
      dataType: 'script',
      success() {
        updateCluster(scatterPlots, [study])
      }
    })
  })

  const menuSelectors = '#annotation, #subsample, #spatial-group'
  $(document).off('change', menuSelectors)
  $(document).on('change', menuSelectors, function() {
    const menu = $(this) // eslint-disable-line
    const newValue = menu.val()
    // keep track for search purposes
    $(`#search_${menu.id}`).val(newValue)
    $(`#gene_set_${menu.id}`).val(newValue)
    scatterPlots(study)
  })

  // listener to redraw expression scatter with new color profile
  $('#colorscale').change(function() {
    const theme = $(this).val() // eslint-disable-line
    setColorScales(theme)
  })

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
}

/** Initialize the "Explore" tab in Study Overview */
export default async function exploreDefault() {
  window.SCP.plots = []

  window.SCP.startPendingEvent('user-action:page:view:site-study',
    { speciesList: window.SCP.taxons },
    'plot:',
    true)

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

    scatterPlots(study)
  }

  if (study.inferCNVIdeogramFiles) {
    // user has no clusters, but does have ideogram annotations

    const ideogramSelect = $('#ideogram_annotation')
    const firstIdeogram = $('#ideogram_annotation option')[1].value

    // manually trigger change to cause ideogram to render
    ideogramSelect.val(firstIdeogram).trigger('change')
  }
}
