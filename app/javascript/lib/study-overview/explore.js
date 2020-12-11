/**
* @fileoverview Functions shared across some of the three Explore tab views
*/

import { getMainViewOptions } from 'lib/study-overview/view-options'
import { scatterPlot } from 'lib/scatter-plot'

/**
 * Load and draw scatter plots for reference clusters, gene + ref clusters
 *
 * Determines which plots to render, per rules specific to "Explore" tab
 *
 * @param {Object} study Study object returned by clusters API endpoint
 * @param {String} gene Searched gene name, e.g. "TP53"
 * @param {Boolean} hasReference Whether each plot has a paired reference
 */
export async function exploreScatterPlots(
  study, gene=null, hasReference=false
) {
  const baseSelector = '#scatter-plots .panel-body'
  const $container = $(baseSelector)
  $container.html('<div class="row multiplot"></div>')
  if (hasReference) {$container.append('<div class="row multiplot"></div>')}

  const accession = study.accession

  // Plot UI properties that are distinct from fetched scatter plot data
  const props = {
    numRows: (hasReference ? 2 : 1),
    numColumns: (study.spatialGroupNames.length > 0) ? 2 : 1
  }

  for (let i = 0; i < props.numColumns; i++) {
    const options = getMainViewOptions(i)
    const apiParams = Object.assign({ accession, gene }, options)

    props.selector = baseSelector + ' .multiplot:nth-child(1)'
    props.hasLegend = true
    props.plotId = `scatter-plot-${i}`

    scatterPlot(apiParams, props)

    if (hasReference) {
      apiParams.gene = null
      props.selector = baseSelector + ' .multiplot:nth-child(2)'
      props.hasLegend = false
      props.plotId += '-reference'
      scatterPlot(apiParams, props)
    }
  }
}
