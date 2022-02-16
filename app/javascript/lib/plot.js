import Plotly from 'plotly.js-dist'
import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'

// Default plot colors, combining ColorBrewer sets 1-3 with tweaks to yellows.
const colorBrewerList = [
  '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628',
  '#f781bf', '#999999', '#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3',
  '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3', '#8dd3c7', '#bebada',
  '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9',
  '#bc80bd', '#ccebc5', '#ffed6f'
]

export const ideogramHeight = 140

export const scatterLabelLegendWidth = 260

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

/** returns an empty trace with arrays initialized based on expectedLength */
function emptyTrace(expectedLength, hasZvalues, hasExpression) {
  const trace = {
    x: new Array(expectedLength),
    y: new Array(expectedLength),
    annotations: new Array(expectedLength),
    cells: new Array(expectedLength),
    newLength: 0 // used to track the post-filter length -- NOT a plotly property
  }
  if (hasZvalues) {
    trace.z = new Array(expectedLength)
  }
  if (hasExpression) {
    trace.expression = new Array(expectedLength)
  }
  return trace
}

/** takes a plotly trace argument and filters out cells based on params.  will return the original object,
 * but with data arrays filtered as appropriate
 * @param labelsToHide {String[]} array of label names to filter out
 * @param cellsToShow {String[]} Array of cell names to show. If null, will show everything
 * @param groupByAnnotation {Boolean} whether to assemble separate traces for each label
 */
export function filterTrace({
  trace, hiddenTraces, groupByAnnotation=false,
  activeTraceLabel, expressionFilter, expressionData
}) {
  const isHidingByLabel = hiddenTraces && hiddenTraces.length
  const isFilteringByExpression = expressionFilter && expressionData &&
    (expressionFilter[0] != 0 || expressionFilter[1] != 1)
  const hasZvalues = !!trace.z
  const hasExpression = !!trace.expression
  const oldLength = trace.x.length
  // if grouping by annotation, traceMap is a hash of annotation names to traces
  // otherwise, traceMap will just have a single 'all' trace
  const traceMap = {}
  const estTraceLength = groupByAnnotation ? trace.x.length / 10 : trace.x.length
  let rawCountsByLabel = { main: trace.x.length } // maintain a list of all cell counts by label for the legend
  const countsByLabel = {}
  if (groupByAnnotation) {
    rawCountsByLabel = countValues(trace.annotations)
  }
  Object.keys(rawCountsByLabel).forEach(key => {
    traceMap[key] = emptyTrace(estTraceLength, hasZvalues, hasExpression)
    traceMap[key].name = key
  })

  if (!isHidingByLabel && !isFilteringByExpression && !groupByAnnotation) {
    return [[trace], rawCountsByLabel]
  }

  let expFilterMin
  let expFilterMax
  let expMin = 99999999
  let expMax = -99999999
  if (isFilteringByExpression) {
    // find the max and min so we can rescale
    for (let i = 0; i < expressionData.length; i++) {
      if (expressionData[i] < expMin) {
        expMin = expressionData[i]
      }
      if (expressionData[i] > expMax) {
        expMax = expressionData[i]
      }
    }
    // convert the expressionFilter, which is on a 0-1 scale, to the expression scale
    const totalRange = expMax - expMin
    expFilterMin = expMin + totalRange * expressionFilter[0]
    expFilterMax = expMin + totalRange * expressionFilter[1]
  }

  const labelNameHash = {}
  if (isHidingByLabel) {
    // build a hash of label => present so we can quickly filter
    for (let i = 0; i < hiddenTraces.length; i++) {
      labelNameHash[hiddenTraces[i]] = true
    }
  }

  // this is the main filter/group loop.  Loop over every cell and determine whether it needs to be filtered,
  // and if it needs to be grouped.
  for (let i = 0; i < oldLength; i++) {
    // if we're not filtering by expression, or the cell is in the range, show it
    if (!isFilteringByExpression || (expressionData[i] >= expFilterMin && expressionData[i] <= expFilterMax)) {
      // if we're not hiding by label, or the label is present in the list, include it
      if (!isHidingByLabel || !labelNameHash[trace.annotations[i]]) {
        const fTrace = groupByAnnotation ? traceMap[trace.annotations[i]] : traceMap.main
        const newIndex = fTrace.newLength
        fTrace.x[newIndex] = trace.x[i]
        fTrace.y[newIndex] = trace.y[i]
        if (hasZvalues) {
          fTrace.z[newIndex] = trace.z[i]
        }
        fTrace.cells[newIndex] = trace.cells[i]
        fTrace.annotations[newIndex] = trace.annotations[i]
        if (hasExpression) {
          fTrace.expression[newIndex] = trace.expression[i]
        }
        fTrace.newLength++
      }
    }
  }
  // now fix the length of the new arrays in each trace to the number of values that were written,
  // and push the traces into an array
  const sortedLabels = getSortedLabels(rawCountsByLabel, activeTraceLabel)
  const traces = sortedLabels.map(key => {
    const fTrace = traceMap[key]
    const subArrays = [fTrace.x, fTrace.y, fTrace.z, fTrace.annotations, fTrace.expression, fTrace.cells]
    subArrays.forEach(arr => {
      if (arr) {
        arr.length = fTrace.newLength
      }
    })
    countsByLabel[key] = fTrace.x.length
    return fTrace
  })
  const expRange = isFilteringByExpression ? [expMin, expMax] : null
  return [traces, countsByLabel, expRange]
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

/**
 * Get value for `style` prop in Plotly scatter plot `trace.transforms`.
 * Also calculate point counts for each label, `countsByLabel`.
 *
 * This is needed so that colors match between the custom Plotly legend
 * entries and each graphical trace in the plot.  (Without this, point
 * set "Foo" could be green in the legend, but red in the plot.)
 *
*/
export function getStyles(countsByLabel, pointSize, customColors, editedCustomColors) {
  const labels = getSortedLabels(countsByLabel)

  const legendStyles = labels
    .map((label, index) => {
      return {
        target: label,
        value: {
          legendrank: index,
          marker: {
            color: getColorForLabel(label, customColors, editedCustomColors, index),
            size: pointSize
          }
        }
      }
    })

  return [legendStyles, countsByLabel]
}


/**
 * Get color for the label, which can be applied to e.g. the icon or the trace
 */
export function getColorForLabel(label, customColors={}, editedCustomColors={}, i) {
  return editedCustomColors[label] ?? customColors[label] ?? getColorBrewerColor(i)
}


/** Sort labels colors are assigned in right order */
export function getSortedLabels(countsByLabel, activeTraceLabel) {
  /** Sort annotation labels naturally, but always put "unspecified" last, and the activeTraceLabel first */
  function labelSort(a, b) {
    if (a === UNSPECIFIED_ANNOTATION_NAME || a === activeTraceLabel) {return 1}
    if (b === UNSPECIFIED_ANNOTATION_NAME || b === activeTraceLabel) {return -1}
    return a.localeCompare(b, 'en', { numeric: true, ignorePunctuation: true })
  }
  return Object.keys(countsByLabel).sort(labelSort)
}


/**
 * Return a hash of value=>count for the passed-in array
 * This is surprisingly quick even for large arrays, but we'd rather we
 * didn't have to do this.  See https://github.com/plotly/plotly.js/issues/5612
*/
function countValues(array) {
  return array.reduce((acc, curr) => {
    acc[curr] ||= 0
    acc[curr] += 1
    return acc
  }, {})
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

/** Get width and height available for plot components, since they may be first rendered hidden */
export function getPlotDimensions({
  isTwoColumn=false,
  isMultiRow=false,
  verticalPad=250,
  horizontalPad=80,
  hasLabelLegend=false,
  hasTitle=false,
  showRelatedGenesIdeogram=false,
  showViewOptionsControls=true
}) {
  // Get width, and account for expanding "View Options" after page load
  let baseWidth = $(window).width()
  if (showViewOptionsControls) {
    baseWidth = Math.round(baseWidth * 10 / 12)
  }
  if (hasLabelLegend) {
    const factor = isTwoColumn ? 2 : 1
    horizontalPad += scatterLabelLegendWidth * factor
  }
  let width = (baseWidth - horizontalPad) / (isTwoColumn ? 2 : 1)

  // Get height
  // Height of screen viewport, minus fixed-height elements above gallery
  let galleryHeight = $(window).height() - verticalPad

  if (showRelatedGenesIdeogram) {
    galleryHeight -= ideogramHeight
  }

  if (hasTitle) {
    galleryHeight -= 20
  }
  let height = galleryHeight
  if (isMultiRow) {
    // Fill as much gallery height as possible, but show tip of next row
    // as an affordance that the gallery is vertically scrollable.
    const secondRowTipHeight = 70
    height = height - secondRowTipHeight
  }
  // ensure aspect ratio isn't too distorted
  if (height > width * 1.3) {
    height = Math.round(width * 1.3)
  }

  // Ensure plots aren't too small.
  // This was needed as of 2020-12-14 to avoid a Plotly error in single-gene
  // view: "Something went wrong with axes scaling"
  height = Math.max(height, 200)
  width = Math.max(width, 200)

  return { width, height }
}
