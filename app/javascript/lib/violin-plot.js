/**
 * @fileoverview Basic functions for violin (and box) plots
 *
 * This code is used for violin plots in the Study Overview page.  Violin
 * plots are shown upon searching a single gene (e.g. "ACE2") in A) gene
 * search on the Home page, or B) Explore tab of Study Overview.
 */

import Plotly from 'plotly.js-dist'

import { plot, getColorBrewerColor } from 'lib/plot'

// To consider: dedup this copy with the one that exists in application.js.
const plotlyDefaultLineColor = 'rgb(40, 40, 40)'

// List of raw plots (API data + UI props, but not yet Plotly-processed)
let violinPlots = []

/** Empty list of raw violin plots */
export function clearViolinPlots() {
  violinPlots = []
}

/**
 * More memory- and time-efficient analog of Math.min
 * From https://stackoverflow.com/a/13440842/10564415.
*/
function arrayMin(arr) {
  let len = arr.length; let min = Infinity
  while (len--) {
    if (arr[len] < min) {
      min = arr[len]
    }
  }
  return min
}

/**
 * More memory- and time-efficient analog of Math.max
 * From https://stackoverflow.com/a/13440842/10564415.
*/
function arrayMax(arr) {
  let len = arr.length; let max = -Infinity
  while (len--) {
    if (arr[len] > max) {
      max = arr[len]
    }
  }
  return max
}

/** Get Plotly layout for violin plot */
function getViolinLayout(title, expressionLabel) {
  return {
    title,
    // Force axis labels, including number strings, to be treated as
    // categories.  See Python docs (same generic API as JavaScript):
    // https://plotly.com/python/axes/#forcing-an-axis-to-be-categorical
    // Relevant Plotly JS example:
    // https://plotly.com/javascript/axes/#categorical-axes
    xaxis: {
      type: 'category'
    },
    yaxis: {
      zeroline: true,
      showline: true,
      title: expressionLabel
    },
    margin: {
      pad: 10,
      b: 100
    },
    autosize: true
  }
}

/**
 * Creates Plotly traces and layout for violin plots and box plots
 *
 * Takes an array of arrays and returns the data array of traces and the
 * layout variable.  More specifically, this will:
 *
 * Iterate through the formatted array
 * [[name_of_trace, expression_data]...]
 * and create the response plotly objects,
 * returning [plotly data object, plotly layout object]
*/
export default function getViolinProps(
  arr, title, jitter='all', expressionLabel, plotType='violin'
) {
  let data = []
  for (let x = 0; x < arr.length; x++) {
    // Plotly violin trace creation, adding to master array
    // get inputs for plotly violin creation
    const dist = arr[x][1]
    const name = arr[x][0]

    // Replace the none selection with bool false for plotly
    if (jitter === '') {
      jitter = false
    }

    // Check if there is a distribution before adding trace
    if (arrayMax(dist) !== arrayMin(dist) && plotType === 'violin') {
      // Make a violin plot if there is a distribution
      data = data.concat([{
        type: 'violin',
        name,
        y: dist,
        points: jitter,
        pointpos: 0,
        jitter: 0.85,
        spanmode: 'hard',
        box: {
          visible: true,
          fillcolor: '#ffffff',
          width: .1
        },
        marker: {
          size: 2,
          color: '#000000',
          opacity: 0.8
        },
        fillcolor: getColorBrewerColor(x),
        line: {
          color: '#000000',
          width: 1.5
        },
        meanline: {
          visible: false
        }
      }])
    } else {
      // Make a boxplot for data with no distribution
      data = data.concat([{
        type: 'box',
        name,
        y: dist,
        boxpoints: jitter,
        marker: {
          color: getColorBrewerColor(x),
          size: 2,
          line: {
            color: plotlyDefaultLineColor
          }
        },
        boxmean: true
      }])
    }
  }

  const layout = getViolinLayout(title, expressionLabel)

  return [data, layout]
}

/** copied from legacy application.js */
function parseResultsToArray(results) {
  const keys = Object.keys(results.values)
  return keys.sort().map(key => {
    return [key, results.values[key].y]
  })
}

/** Convenience wrapper for getViolinProps */
function getViolinPropsWrapper(rawPlot) {
  // The code below is heavily borrowed from legacy application.js
  const dataArray = parseResultsToArray(rawPlot)
  const jitter = rawPlot.values_jitter ? rawPlot.values_jitter : ''
  const plotType = rawPlot.plotType ? rawPlot.plotType : 'violin'
  const traceData = getViolinProps(
    dataArray, rawPlot.rendered_cluster, jitter, rawPlot.y_axis_title, plotType
  )
  return traceData
}

/** Formats expression data for Plotly, draws violin (or box) plot */
export function renderViolinPlot(target, results) {
  const traceData = getViolinPropsWrapper(results)
  const expressionData = [...traceData[0]]
  const expressionLayout = traceData[1]
  // Check that the ID exists on the page to avoid errors in corner cases
  // where users update search terms quickly or are toggling between study
  // and gene view.
  if (document.getElementById(target)) {
    plot(target, expressionData, expressionLayout)
  }
}

/** Resize Plotly violin -- e.g. upon resizing window or plot container  */
export function resizeViolinPlot() {
  const rawPlot = violinPlots[0]
  if (!rawPlot) {
    return // this can happen if resize is called as the graph is being redrawn
  }
  const title = rawPlot.rendered_cluster
  const expressionLabel = rawPlot.y_axis_title
  const layout = getViolinLayout(title, expressionLabel)
  Plotly.relayout(rawPlot.plotId, layout)
}

/** Set plot in "Distribution" tab to a violin plot or box plot */
export function updateDistributionPlotType(type) {
  const rawPlot = violinPlots[0]
  rawPlot.plotType = type
  renderViolinPlot(rawPlot.plotId, rawPlot)
}

/**
* Update data points in violin or box plot
*
* Adapted from _boxpoints_picker.html.erb
*/
export function updateDataPoints(mode) {
  const rawPlot = violinPlots[0]
  const traceData = getViolinPropsWrapper(rawPlot)
  const expressionData = [...traceData[0]]

  $('#boxpoints').val(mode)
  $('#selected_boxpoints').val(mode)

  const plotType = $('#plot_type').val()
  const updateMode = mode === '' ? false : mode
  $(expressionData).each(function() {
    switch (plotType) {
      case 'violin':
        // eslint-disable-next-line no-invalid-this
        this.points = updateMode
        break
      case 'box':
        // eslint-disable-next-line no-invalid-this
        this.boxpoints = updateMode
        break
    }
  })
  Plotly.react('box-plot', expressionData)
}
