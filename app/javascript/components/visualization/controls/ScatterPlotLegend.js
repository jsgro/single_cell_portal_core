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
  filterId, numLabels,
  filters, updateFilters
}) {
  let entry = `${label} (${numPoints} points)`
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isSelected = filters.includes(filterId)

  const iconStyle = { backgroundColor: iconColor }
  const checkmark = (filters.length === 0 || isSelected ? '✓' : '')
  const selectedClass = (isSelected ? 'selected' : '')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const state = !isSelected
    updateFilters(filterId, state, numLabels)
  }

  return (
    <div
      className={`scatter-legend-row ${selectedClass}`}
      onClick={() => toggleSelection()}
    >
      <div className="scatter-legend-icon" style={iconStyle}>
        <span className="checkmark">{checkmark}</span>
      </div>
      <div className="scatter-legend-entry">{entry}</div>
    </div>
  )
}

// /** Whether "Display all" should be checked */
// function doCheckDisplayAll(checkDisplayAll, filters, labels) {
//   const numFilters = filters.length
//   const numLabels = labels.length
//   const anyFilters = numFilters > 0
//   const allFilters = numFilters === numLabels
//   console.log(
//     'anyFilters, isDisplayAllTrigger, allFilters',
//     anyFilters, isDisplayAllTrigger, allFilters
//   )
//   console.log('!anyFilters && !(isDisplayAllTrigger && !allFilters)')
//   console.log(!anyFilters && !(isDisplayAllTrigger && !allFilters))
//   return (
//     !anyFilters &&
//     !(isDisplayAllTrigger && !allFilters)
//   )
// }

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, countsByLabel, correlations,
  filters, updateFilters, checkDisplayAll
}) {
  const labels = Object.keys(countsByLabel)
  const filterIds = []
  const numLabels = labels.length

  const legendEntries = labels
    .sort(labelSort) // sort keys so we assign colors in the right order
    .map((label, index) => {
      const numPoints = countsByLabel[label]
      const iconColor = getColorBrewerColor(index)

      const filterId = _kebabCase(label)
      filterIds.push(filterId)

      return (
        <LegendEntry
          key={filterId}
          label={label}
          numPoints={numPoints}
          iconColor={iconColor}
          correlations={correlations}
          filters={filters}
          updateFilters={updateFilters}
          filterId={filterId}
          numLabels={numLabels}
        />
      )
    })

  // When no filters are checked
  const hasFilters = (filters.length > 0)

  // console.log(
  //   'hasFilters, isDisplayAllTrigger, filters.length, labels.length',
  //   hasFilters, isDisplayAllTrigger, filters.length, labels.length
  // )

  const filteredClass = (hasFilters) ? 'filtered' : ''
  return (
    <div className={`scatter-legend ${filteredClass}`}>
      <div>
        <label>
          <input
            checked={checkDisplayAll}
            type="checkbox"
            onChange={e => updateFilters(labels, e.target.checked)}
          />All
        </label>
      </div>
      <p className="scatter-legend-name">{name}</p>
      {legendEntries}
    </div>
  )
}
