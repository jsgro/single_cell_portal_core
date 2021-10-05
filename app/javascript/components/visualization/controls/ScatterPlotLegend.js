import React from 'react'
import _kebabCase from 'lodash/kebabCase'

import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'
import { getColorBrewerColor } from 'lib/plot'

/** Sort annotation labels naturally, but always put "unspecified" last */
function labelSort(a, b) {
  if (a === UNSPECIFIED_ANNOTATION_NAME) {return 1}
  if (b === UNSPECIFIED_ANNOTATION_NAME) {return -1}
  return a.localeCompare(b, 'en', { numeric: true, ignorePunctuation: true })
}


/**
 * Return a hash of value=>count for the passed-in array
 * This is surprisingly quick even for large arrays, but we'd rather we
 * didn't have to do this.  See https://github.com/plotly/plotly.js/issues/5612
*/
function countValues(array) {
  return array.reduce((acc, curr) => {
    if (!acc[curr]) {
      acc[curr] = 1
    } else {
      acc[curr] += 1
    }
    return acc
  }, {})
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
export function getStyles(data, pointSize) {
  const countsByLabel = countValues(data.annotations)

  const labels = Object.keys(countsByLabel)

  const legendStyles = labels
    .sort(labelSort) // sort keys so we assign colors in the right order
    .map((label, index) => {
      return {
        target: label,
        value: {
          legendrank: index,
          marker: {
            color: getColorBrewerColor(index),
            size: pointSize
          }
        }
      }
    })

  return [legendStyles, countsByLabel]
}

/** Component for row in legend */
function LegendEntry({
  label, numPoints, iconColor, correlations,
  filters, updateFilters
}) {
  let entry = `${label} (${numPoints} points)`
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isSelected = filters.includes(label)

  const iconStyle = { backgroundColor: iconColor }
  const selectedClass = (isSelected ? 'selected' : '')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const state = !isSelected
    updateFilters(label, state)
  }

  return (
    <div
      className={`scatter-legend-row ${selectedClass}`}
      onClick={() => toggleSelection()}
    >
      <div className="scatter-legend-icon" style={iconStyle}></div>
      <div className="scatter-legend-entry">{entry}</div>
    </div>
  )
}


// function DisplayAll() {

// }

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, countsByLabel, correlations,
  filters, updateFilters
}) {
  const labels = Object.keys(countsByLabel)

  const legendEntries = labels
    .sort(labelSort) // sort keys so we assign colors in the right order
    .map((label, index) => {
      const numPoints = countsByLabel[label]
      const iconColor = getColorBrewerColor(index)

      return (
        <LegendEntry
          label={label}
          numPoints={numPoints}
          iconColor={iconColor}
          correlations={correlations}
          filters={filters}
          updateFilters={updateFilters}
          key={`legend-entry-${index}`}
        />
      )
    })

  const filteredClass = (filters.length > 0) ? 'filtered' : ''
  return (
    <div className={`scatter-legend ${filteredClass}`}>
      <p className="scatter-legend-name">{name}</p>
      {legendEntries}
    </div>
  )
}
