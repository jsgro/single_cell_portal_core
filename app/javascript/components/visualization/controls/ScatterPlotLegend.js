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


/** Get font family and size */
function getFont(fontCfg) {
  const family = fontCfg.family ? fontCfg.family : 'sans-serif'
  const size = fontCfg.size ? fontCfg.size : '14px'
  const weight = fontCfg.weight ? fontCfg.weight : '400'

  const font = `${weight} ${size} ${family}`

  return font
}

/**
 * Get width and height of given text in pixels.
 *
 * Background: https://erikonarheim.com/posts/canvas-text-metrics/
 */
function getTextSize(text, fontCfg) {
  const font = getFont(fontCfg)

  // Reuse canvas object for better performance
  const canvas =
    getTextSize.canvas ||
    (getTextSize.canvas = document.createElement('canvas'))
  const context = canvas.getContext('2d')
  context.font = font
  const metrics = context.measureText(text)

  // metrics.width is less precise than technique below
  const right = metrics.actualBoundingBoxRight
  const left = metrics.actualBoundingBoxLeft
  const width = Math.abs(left) + Math.abs(right)

  const height =
    Math.abs(metrics.actualBoundingBoxAscent) +
    Math.abs(metrics.actualBoundingBoxDescent)

  return { width, height }
}

/** Get legend width, which depends on maximum legend entry width */
export function getLegendWidth(countsByLabel, correlations) {
  const labels = Object.keys(countsByLabel)
  let maxWidth = 0
  labels.forEach(label => {
    const entryText = getEntryText(label, countsByLabel, correlations)
    const width = getTextSize(entryText).width
    if (width > maxWidth) {
      maxWidth = width
    }
  })
  return maxWidth + 20
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

/** Get text for a legend entry */
function getEntryText(label, countsByLabel, correlations) {
  const numPoints = countsByLabel[label]
  let entry = `${label} (${numPoints} points)`
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }
  return entry
}

/** Component for row in legend */
function LegendEntry({
  entryText, iconColor,
  filterId, numLabels,
  filters, updateFilters
}) {
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
      <div className="scatter-legend-entry">{entryText}</div>
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
      const entryText = getEntryText(label, countsByLabel, correlations)

      const iconColor = getColorBrewerColor(index)

      const filterId = _kebabCase(label)
      filterIds.push(filterId)

      return (
        <LegendEntry
          key={filterId}
          entryText={entryText}
          iconColor={iconColor}
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

  const htmlName = `all-checkbox-${_kebabCase(name)}`

  const filteredClass = (hasFilters) ? 'filtered' : ''
  return (
    <div className={`scatter-legend ${filteredClass}`}>
      <div>
        <p className="scatter-legend-name">{name}</p>
        <input
          checked={checkDisplayAll}
          data-analytics-name="all-checkbox"
          id={htmlName}
          type="checkbox"
          onChange={e => updateFilters(labels, e.target.checked)}
        />
        <label htmlFor={htmlName}>All</label>
      </div>
      {legendEntries}
    </div>
  )
}
