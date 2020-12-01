import { plot, getColorBrewerColor } from 'lib/plot'

// To consider: dedup this copy with the one that exists in application.js.
const plotlyDefaultLineColor = 'rgb(40, 40, 40)'

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
  arr, title, jitter='all', expressionLabel
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
    if (arrayMax(dist) !== arrayMin(dist)) {
      // Make a violin plot if there is a distribution
      data = data.concat([{
        'type': 'violin',
        name,
        'y': dist,
        'points': jitter,
        'pointpos': 0,
        'jitter': 0.85,
        'spanmode': 'hard',
        'box': {
          visible: true,
          fillcolor: '#ffffff',
          width: .1
        },
        'marker': {
          size: 2,
          color: '#000000',
          opacity: 0.8
        },
        'fillcolor': getColorBrewerColor(x),
        'line': {
          color: '#000000',
          width: 1.5
        },
        'meanline': {
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

  const layout = {
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

  return [data, layout]
}

/** copied from legacy application.js */
function parseResultsToArray(results) {
  const keys = Object.keys(results.values)
  return keys.sort().map(key => {
    return [key, results.values[key].y]
  })
}

/** Formats expression data for Plotly, draws violin (or box) plot */
export function drawViolinPlot(target, results) {
  // The code below is heavily borrowed from legacy application.js
  const dataArray = parseResultsToArray(results)
  const jitter = results.values_jitter ? results.values_jitter : ''
  const traceData = getViolinProps(
    dataArray, results.rendered_cluster, jitter, results.y_axis_title
  )
  const expressionData = [].concat.apply([], traceData[0])
  const expressionLayout = traceData[1]
  // Check that the ID exists on the page to avoid errors in corner cases
  // where users update search terms quickly or are toggling between study
  // and gene view.
  if (document.getElementById(target)) {
    plot(target, expressionData, expressionLayout)
  }
}
