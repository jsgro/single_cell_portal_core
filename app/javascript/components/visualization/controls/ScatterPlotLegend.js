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
  filters, updateFilters, allHidden
}) {
  let entry = `${label} (${numPoints} points)`
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isShown = filters.includes(filterId)

  const iconStyle = { backgroundColor: iconColor }
  let selectedClass
  // !allHidden && !isShown: no
  // allHidden && !isShown: no
  // allHidden && isShown: no
  if (!allHidden && isShown) {
    selectedClass = 'shown'
  } else {
    selectedClass = ''
  }

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const state = !isShown
    updateFilters(filterId, state, numLabels)
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

/** Component for stateful link */
function StatefulLink({ text, classes, disabled, onClick, analyticsName, style }) {
  return (
    <span
      data-analytics-name={analyticsName}
      className={classes}
      disabled={disabled}
      style={style}
      onClick={onClick}>{text}</span>
  )
}

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, countsByLabel, correlations,
  filters, updateFilters, showHideButtons, allHidden
}) {
  const labels = Object.keys(countsByLabel)
  const filterIds = labels.map(label => _kebabCase(label))
  const numLabels = labels.length

  const legendEntries = labels
    .sort(labelSort) // sort keys so we assign colors in the right order
    .map((label, i) => {
      const numPoints = countsByLabel[label]
      const iconColor = getColorBrewerColor(i)

      return (
        <LegendEntry
          key={filterIds[i]}
          label={label}
          numPoints={numPoints}
          iconColor={iconColor}
          correlations={correlations}
          filters={filters}
          updateFilters={updateFilters}
          filterId={filterIds[i]}
          numLabels={numLabels}
          allHidden={allHidden}
        />
      )
    })

  // When some (but not all) filters are checked
  // const someFilters = (filters.length > 0 && filters.length < labels.length)

  // console.log(
  //   'hasFilters, isDisplayAllTrigger, filters.length, labels.length',
  //   hasFilters, isDisplayAllTrigger, filters.length, labels.length
  // )

  const filteredClass = (filters.length === 0) ? 'unfiltered' : ''
  return (
    <div className={`scatter-legend ${filteredClass}`}>
      <div className="scatter-legend-head">
        <div>
          {/* <button
          data-analytics-name='show-all'
          className={`btn btn-primary ${showHideButtons[0]}`}
          disabled={!showHideButtons[0]}
          onClick={() => {updateFilters(filterIds, false)}}>Show all</button>
        <button
          data-analytics-name='hide-all'
          style={{ 'float': 'right' }}
          className={`btn btn-primary ${showHideButtons[1]}`}
          disabled={!showHideButtons[1]}
          onClick={() => {updateFilters(filterIds, true)}}>Hide all</button> */}
          <StatefulLink
            analyticsName='show-all'
            classes={`stateful-link ${showHideButtons[0]}`}
            disabled={!showHideButtons[0]}
            onClick={() => {updateFilters(filterIds, false)}}
            text="Show all" />
          <StatefulLink
            analyticsName='hide-all'
            classes={`stateful-link pull-right ${showHideButtons[1]}`}
            disabled={!showHideButtons[1]}
            onClick={() => {updateFilters(filterIds, true)}}
            text="Hide all" />
        </div>
        <div className="scatter-legend-name">{name}</div>
      </div>
      {legendEntries}
    </div>
  )
}
