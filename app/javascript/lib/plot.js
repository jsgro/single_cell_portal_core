import Plotly from 'plotly.js-dist'
import { clearScatterPlots } from 'lib/scatter-plot'
import { clearViolinPlots } from 'lib/violin-plot'

// Default plot colors, combining ColorBrewer sets 1-3 with tweaks to yellows.
const colorBrewerList = [
  '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628',
  '#f781bf', '#999999', '#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3',
  '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3', '#8dd3c7', '#bebada',
  '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9',
  '#bc80bd', '#ccebc5', '#ffed6f'
]

/**
 * Used in both categorical scatter plots and violin plots, to ensure
 * they use consistent friendly colors for annotations, etc.
 */
export function getColorBrewerColor(index) {
  return colorBrewerList[index % 27]
}

// default title font settings for axis titles in plotly
export const titleFont = {
  family: 'Helvetica Neue',
  size: 16,
  color: '#333'
}

// default label font settings for colorbar titles in plotly
export const labelFont = {
  family: 'Helvetica Neue',
  size: 12,
  color: '#333'
}

export const lineColor = 'rgb(40, 40, 40)'

/**
 * Clear all raw plot lists: scatter plots, violin plots, etc.
 *
 * Use when reinitializing views, e.g. in Explore tab
 */
export function clearPlots() {
  clearScatterPlots()
  clearViolinPlots()
}

/**
 * Wrapper for Plotly.newPlot, to enable tests
 *
 * Having this function in a separate module is needed for mocking in related
 * test (study-violin-plot.test.js), due to (1) and buggy workaround (2).
 *
 * 1) SVG path getTotalLength method is undefined in jsdom library used by Jest
 *    Details: https://github.com/jsdom/jsdom/issues/1330
 *
 * 2) jest.mock() does not work when module name has ".js" in it
 *    Details: https://github.com/facebook/jest/issues/6420
 */
export function plot(graphElementId, data, layout) {
  Plotly.newPlot(
    graphElementId,
    data,
    layout
  )
}

// To consider: dedup this copy with the one that exists in application.js.
export const plotlyDefaultLineColor = 'rgb(40, 40, 40)'

/**
 * More memory- and time-efficient analog of Math.min
 * From https://stackoverflow.com/a/13440842/10564415.
*/
export function arrayMin(arr) {
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
export function arrayMax(arr) {
  let len = arr.length; let max = -Infinity
  while (len--) {
    if (arr[len] > max) {
      max = arr[len]
    }
  }
  return max
}

