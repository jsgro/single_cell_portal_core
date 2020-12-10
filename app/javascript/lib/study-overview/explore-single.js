/**
* @fileoverview Single-gene view in "Explore" tab of Study Overview page
*
* The Explore tab has three views:
*
*   - Default view (explore-default.js) has tabs:
*        1. "Clusters": scatter plots
*        2. "Genomes": igv.js, if study has BAM files

*   - Single-gene view (this file) has tabs:
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

import { scatterPlot, initScatterPlots, resizeScatterPlots } from 'lib/scatter-plot'
import { violinPlot, resizeViolinPlot } from 'lib/violin-plot'
import { clearPlots } from 'lib/plot'
import {
  addSpatialDropdown, getMainViewOptions, getAnnotParams, handleMenuChange
} from 'lib/study-overview/view-options'

/** Render violin and scatter plots for the Explore tab's single-gene view */
async function renderSingleGenePlots(study, gene) {
  clearPlots()

  $('#box-plot').html('')
  $('#scatter-plots .panel-body').html('')

  // Draw violin (or box) plot if showing group annotation, or
  // draw scatter plot if showing numeric annotation
  const annotType = getAnnotParams().type
  if (annotType === 'group') {
    $('#distribution-link').html('Distribution')
    violinPlot('box-plot', study, gene)
  } else {
    $('#distribution-link').html('Annotated Scatter')
    const accession = study.accession
    const options = getMainViewOptions(0)
    const context = { accession, gene, isAnnotatedScatter: true }
    const clusterParams = Object.assign(context, options)
    const frame = { selector: '#box-plot', plotId: 'scatter-plot-annotated' }
    scatterPlot(clusterParams, frame)
  }

  initScatterPlots(study, gene, true)

  window.showRelatedGenesIdeogram()
}

/** Listen for events, and update view accordingly */
function attachEventHandlers(study, gene) {
  // resize listener
  $(window).off('resizeEnd') // Clear any existing handler
  $(window).on('resizeEnd', () => {
    resizeScatterPlots()
    resizeViolinPlot()
  })

  handleMenuChange(renderSingleGenePlots, [study, gene])
}

/** Initialize single-gene view for "Explore" tab in Study Overview */
export default async function exploreSingle() {
  // As set in exploreDefault
  const study = window.SCP.study
  const gene = window.SCP.gene

  attachEventHandlers(study, gene)

  addSpatialDropdown(study)

  renderSingleGenePlots(study, gene)
}
