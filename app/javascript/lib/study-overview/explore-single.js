/**
* @fileoverview Single-gene view in "Explore" tab of Study Overview page
*
* The Explore tab has three views:
*   - Default: Shows "Clusters" and sometimes "Genomes", etc.
*   - Single-gene: Shows distribution (violin or box) plot and others
*   - Multiple-genes: Shows dot plot and heatmap
*/

import { fetchExpressionViolin } from 'lib/scp-api'
import { drawScatterPlots, resizePlots, setColorScales } from 'lib/scatter-plot'
import { drawViolinPlot } from 'lib/violin-plot'

const baseCamera = {
  'up': { 'x': 0, 'y': 0, 'z': 1 },
  'center': { 'x': 0, 'y': 0, 'z': 0 },
  'eye': { 'x': 1.25, 'y': 1.25, 'z': 1.25 }
}

/** Fetch expression data and draw violin (or box) plot */
async function renderViolinPlot(target, study, gene) {
  const targetDom = document.getElementById(target)
  const spinner = new Spinner(window.opts).spin(targetDom)

  const violinData = await fetchExpressionViolin(study.accession,
    gene,
    study.cluster,
    study.annotation,
    study.subsample)

  drawViolinPlot(target, violinData)

  spinner.stop()
}

/** Render violin and scatter plots for the Explore tab's single-gene view */
function renderSingleGenePlots(study, gene) {
  $(window).off('resizeEnd')

  renderViolinPlot('box-plot', study, gene)
  drawScatterPlots(window.SCP.study)
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
  $(window).on('resizeEnd', () => {resizePlots()})

  const menuSelectors = '#annotation, #subsample, #cluster, #spatial-group'
  $(document).on('change', menuSelectors, function() {
    const menu = $(this) // eslint-disable-line
    const newValue = menu.val()
    // keep track for search purposes
    $(`#search_${menu.id}`).val(newValue)
    $(`#gene_set_${menu.id}`).val(newValue)
    renderSingleGenePlots(study, gene)
  })
}

/** Initialize single-gene view for "Explore" tab in Study Overview */
export default async function exploreSingle() {
  // As set in exploreDefault
  const study = window.SCP.study
  const gene = window.SCP.gene

  attachEventHandlers(study, gene)

  renderSingleGenePlots(study, gene)
}
