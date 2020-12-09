/**
* @fileoverview Single-gene view in "Explore" tab of Study Overview page
*
* The Explore tab has three views:
*   - Default: Shows "Clusters" and sometimes "Genomes", etc.
*   - Single-gene: Shows distribution (violin or box) plot and others
*   - Multiple-genes: Shows dot plot and heatmap
*/

import {
  scatterPlot, scatterPlots, resizeScatterPlots
} from 'lib/scatter-plot'
import { violinPlot, resizeViolinPlot } from 'lib/violin-plot'
import {
  addSpatialDropdown, getMainViewOptions, getAnnotParams, handleMenuChange
} from 'lib/study-overview/view-options'

/** Render violin and scatter plots for the Explore tab's single-gene view */
async function renderSingleGenePlots(study, gene) {
  window.SCP.scatterPlots = []
  window.SCP.violinPlots = []

  $('#box-plot').html()
  $('#scatter-plots .panel-body').html()

  // Draw violin (or box) plot if showing group annotation, or
  // draw scatter plot if showing numeric annotation
  const annotType = getAnnotParams().type
  if (annotType === 'group') {
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

  scatterPlots(study, gene, true)

  window.showRelatedGenesIdeogram()

  // var target3 = document.getElementById('reference-plot');

  // if error in any of above, show:
  // showMessageModal(null, "An error has occurred loading the data.<br><br>If the error persists after reloading the page, please contact us at <br><a href='mailto:scp-support@broadinstitute.zendesk.com'>scp-support@broadinstitute.zendesk.com</a>");

  // no need to store spinners in data attribute as entire plot div will be re-rendered
  // var spin2 = new Spinner(opts).spin(target2);
  // var spin3 = new Spinner(opts).spin(target3);

  // var urlParams = getRenderUrlParams();

  // var delimiter = "<%= params[:gene] ? "?".html_safe : "&".html_safe %>";
  // url += delimiter + urlParams;
  // $.ajax({
  //     url: url,
  //     method: 'GET',
  //     dataType: 'script'
  // }).fail(function() {
  //     spin2.stop()
  //     spin3.stop()

  // });
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
