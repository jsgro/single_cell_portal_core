import React from 'react'
import { log } from 'lib/metrics-api'

import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'
import { getColorBrewerColor, scatterLabelLegendWidth } from 'lib/plot'

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
    acc[curr] ||= 0
    acc[curr] += 1
    return acc
  }, {})
}

/** Sort labels colors are assigned in right order */
function getLabels(countsByLabel) {
  return Object.keys(countsByLabel).sort(labelSort)
}

/** Convert state Boolean to attribute string */
function getActivity(isActive) {
  return isActive ? 'active' : 'disabled'
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

  const labels = getLabels(countsByLabel)

  const legendStyles = labels
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
  numLabels, hiddenTraces, updateHiddenTraces
}) {
  let entry = label

  const hasCorrelations = correlations !== null
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isShown = hiddenTraces.includes(label)

  const iconStyle = { backgroundColor: iconColor }
  const shownClass = (isShown ? '' : 'shown')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const wasShown = !isShown
    updateHiddenTraces(label, wasShown)

    const legendEntry = {
      label, numPoints, numLabels, wasShown, iconColor,
      hasCorrelations
    }
    log('click:scatterlegend:single', legendEntry)
  }

  return (
    <div
      className={`scatter-legend-row ${shownClass}`}
      role="button"
      onClick={() => toggleSelection()}
    >
      <div className="scatter-legend-icon" style={iconStyle}></div>
      <div className="scatter-legend-entry">
        <span className="legend-label" title={entry}>{entry}</span>
        <span className="num-points" title={`${numPoints} points in this group`}>{numPoints}</span>
      </div>
    </div>
  )
}

/** Handle click on "Show all" or "Hide all" button */
function showHideAll(showOrHide, labels, updateHiddenTraces) {
  if (showOrHide === 'show') {
    updateHiddenTraces(labels, false, true)
  } else {
    updateHiddenTraces(labels, true, true)
  }
}

/** Get status of "Show all" and "Hide all" links */
function getShowHideEnabled(hiddenTraces, countsByLabel) {
  const numHiddenTraces = hiddenTraces.length
  const numLabels = Object.keys(countsByLabel).length

  let enabled // [isShowAllEnabled, isHideAllEnabled]

  if (countsByLabel === null) {
    // When nothing has loaded yet
    enabled = [false, false]
  } else if (numHiddenTraces === numLabels) {
    // When all groups are hidden
    enabled = [true, false]
  } else if (numHiddenTraces < numLabels && numHiddenTraces > 0) {
    // When some groups are hidden and some are shown
    enabled = [true, true]
  } else if (numHiddenTraces === 0) {
    // When no groups are hidden
    enabled = [false, true]
  }

  return enabled
}

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, height, countsByLabel, correlations, hiddenTraces,
  updateHiddenTraces
}) {
  const labels = getLabels(countsByLabel)
  const numLabels = labels.length

  const legendEntries = labels
    .map((label, i) => {
      const numPoints = countsByLabel[label]
      const iconColor = getColorBrewerColor(i)

      return (
        <LegendEntry
          key={label}
          label={label}
          numPoints={numPoints}
          iconColor={iconColor}
          correlations={correlations}
          hiddenTraces={hiddenTraces}
          updateHiddenTraces={updateHiddenTraces}
          numLabels={numLabels}
        />
      )
    })

  const style = { width: scatterLabelLegendWidth, height }
  const filteredClass = (hiddenTraces.length === 0) ? 'unfiltered' : ''
  const [showIsEnabled, hideIsEnabled] =
    getShowHideEnabled(hiddenTraces, countsByLabel)

  return (
    <div
      className={`scatter-legend ${filteredClass}`}
      style={style}>
      <div className="scatter-legend-head">
        <div>
          <p className="scatter-legend-name">{name}</p>
          {labels.length > 1 &&
          <>
            <a
              role="button"
              data-analytics-name='legend-show-all'
              className={`stateful-link ${getActivity(showIsEnabled)}`}
              disabled={!showIsEnabled}
              onClick={() => {showHideAll('show', labels, updateHiddenTraces)}}
            >Show all</a>
            <a
              role="button"
              data-analytics-name='legend-hide-all'
              className={`stateful-link pull-right ${getActivity(hideIsEnabled)}`}
              disabled={!hideIsEnabled}
              onClick={() => {showHideAll('hide', labels, updateHiddenTraces)}}
            >Hide all</a>
          </>
          }
        </div>
      </div>
      {legendEntries}
    </div>
  )
}
