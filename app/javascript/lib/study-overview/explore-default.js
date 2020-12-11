/**
* @fileoverview Default view in "Explore" tab of Study Overview page
*
* The Explore tab has three views:
*
*   - Default view (this file) has tabs:
*        1. "Clusters": scatter plots
*        2. "Genomes": igv.js, if study has BAM files

*   - Single-gene view (explore-single.js) has tabs:
*        1a. "Distribution": violin plots if group annotation
*        1b. "Annotated Scatter": scatter plots if numeric annotation
*        2. "Scatter": scatter plots for gene-specific and reference expression

*   - Multiple-genes view (in legacy ERB templates) has tabs:
*       1. "Dot Plot"
*       2. "Heatmap"
*
*   If the study has "Spatial groups" (cluster files with spatial positions for
*   transcriptomics data), then the scatter plots show two sets of side-by-side
*   plots.  HTML scaffolding for all views exists in legacy ERB templates.
*/

import { fetchExplore } from 'lib/scp-api'
import { exploreScatterPlots } from 'lib/study-overview/explore'
import { resizeScatterPlots } from 'lib/scatter-plot'
import { clearPlots } from 'lib/plot'
import {
  addSpatialDropdown, handleMenuChange
} from 'lib/study-overview/view-options'

const baseCamera = {
  up: { x: 0, y: 0, z: 1 },
  center: { x: 0, y: 0, z: 0 },
  eye: { x: 1.25, y: 1.25, z: 1.25 }
}

/** Listen for events, and update view accordingly */
function attachEventHandlers(study) {
  // resize listener
  $(window).off('resizeEnd') // Clear any existing handler
  $(window).on('resizeEnd', () => {
    resizeScatterPlots()
  })

  handleMenuChange(exploreScatterPlots, [study])

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
  clearPlots()

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

    exploreScatterPlots(study)
  }

  if (study.inferCNVIdeogramFiles) {
    // user has no clusters, but does have ideogram annotations

    const ideogramSelect = $('#ideogram_annotation')
    const firstIdeogram = $('#ideogram_annotation option')[1].value

    // manually trigger change to cause ideogram to render
    ideogramSelect.val(firstIdeogram).trigger('change')
  }
}
