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

import { exploreScatterPlots } from 'lib/study-overview/explore'
import { scatterPlot, resizeScatterPlots } from 'lib/scatter-plot'
import { violinPlot, resizeViolinPlot } from 'lib/violin-plot'
import { clearPlots } from 'lib/plot'
import {
  addSpatialDropdown, getMainViewOptions, getAnnotParams, handleMenuChange
} from 'lib/study-overview/view-options'

/** Render violin and scatter plots for the Explore tab's single-gene view
 * this also handles multi-gene plots where the genes are collapsed by mean/median
 */
async function renderSingleGenePlots(study, gene) {
  clearPlots()

  $('#box-plot').html('')
  $('#scatter-plots .panel-body').html('')
  const consensus = $('#search_consensus').val()

  // Draw violin (or box) plot if showing group annotation, or
  // draw scatter plot if showing numeric annotation
  const annotType = getAnnotParams().type
  if (annotType === 'group') {
    $('#distribution-link').html('Distribution')
    violinPlot('box-plot', study, gene, consensus)
  } else {
    $('#distribution-link').html('Annotated Scatter')
    const accession = study.accession
    const options = getMainViewOptions(0)
    const context = { accession, gene, isAnnotatedScatter: true }
    const clusterParams = Object.assign(context, options)
    const frame = { selector: '#box-plot', plotId: 'scatter-plot-annotated' }
    scatterPlot(clusterParams, frame)
  }

  exploreScatterPlots(study, gene, true)

  const geneList = window.SCP.formatTerms(gene)
  if (geneList.length > 1) {
    // draw the dotPlot for comparison if this is a multi-gene collapsed by mean
    window.drawHeatmap()
    // reattach the event handlers, since that call removes them
    attachEventHandlers(study, gene)
  } else if (geneList.length === 1) {
    // only show ideogram for single gene queries
    window.showRelatedGenesIdeogram()
  }
}

/** Listen for events, and update view accordingly */
function attachEventHandlers(study, gene) {
  // resize listener
  $(window).off('resizeEnd') // Clear any existing handler
  $(window).on('resizeEnd', () => {
    resizeScatterPlots()
    // calling this method is safe even if there is no violin plot currently
    resizeViolinPlot()
  })

  handleMenuChange(renderSingleGenePlots, [study, gene])
}

/** Initialize single-gene view for "Explore" tab in Study Overview */
export default async function exploreSingle() {
  // As set in exploreDefault
  const study = window.SCP.study
  let gene = window.SCP.gene
  if (!gene || !gene.length) {
    // if window.SCP.gene is not defined, read it from the search bar
    // this happens when, e.g. 'view as' -> 'violin - mean' is selected
    gene = window.SCP.formatTerms($('#search_genes').val()).join(',')
  }

  attachEventHandlers(study, gene)

  addSpatialDropdown(study)

  renderSingleGenePlots(study, gene)
}
