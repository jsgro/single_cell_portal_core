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
  numLabels, shownTraces, updateShownTraces
}) {
  let entry = label

  const hasCorrelations = correlations !== null
  if (correlations) {
    const correlation = Math.round(correlations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints} points, ρ = ${correlation})`
  }

  const isShown = shownTraces.includes(label)

  const iconStyle = { backgroundColor: iconColor }
  const shownClass = (isShown ? '' : 'shown')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const wasShown = !isShown
    updateShownTraces(label, wasShown, numLabels)

    const legendEntry = {
      label, numPoints, numLabels, wasShown, shownTraces, iconColor,
      hasCorrelations
    }
    log('click:scatterlegend:single', legendEntry)
  }

  return (
    <div
      className={`scatter-legend-row ${shownClass}`}
      onClick={event => toggleSelection(event)}
    >
      <div className="scatter-legend-icon" style={iconStyle}></div>
      <div className="scatter-legend-entry">
        <span className="legend-label" title={entry}>{entry}</span>
        <span className="num-points" title={`${numPoints} points have this label`}>{numPoints}</span>
      </div>
    </div>
  )
}

/** Handle click on "Show all" or "Hide all" button */
function showHideAll(showOrHide, labels, updateShownTraces) {
  if (showOrHide === 'show') {
    updateShownTraces(labels, false, null, true)
  } else {
    updateShownTraces(labels, true, null, true)
  }

  const numLabels = labels.length
  log(`click:scatterlegend:${showOrHide}-all-labels`, {
    labels, numLabels
  })
}

/** Component for custom legend for scatter plots */
export default function ScatterPlotLegend({
  name, height, countsByLabel, correlations, shownTraces,
  updateShownTraces, showHideActive
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
          shownTraces={shownTraces}
          updateShownTraces={updateShownTraces}
          numLabels={numLabels}
        />
      )
    })

  const style = { width: scatterLabelLegendWidth, height }
  const filteredClass = (shownTraces.length === 0) ? 'unfiltered' : ''
  const [showIsActive, hideIsActive] = showHideActive
  return (
    <div
      className={`scatter-legend ${filteredClass}`}
      style={style}>
      <div className="scatter-legend-head">
        <div>
          <p className="scatter-legend-name">{name}</p>
          <a
            role="button"
            data-analytics-name='legend-show-all'
            className={`stateful-link ${getActivity(showIsActive)}`}
            disabled={!showIsActive}
            onClick={() => {showHideAll('show', labels, updateShownTraces)}}
          >Show all</a>
          <a
            role="button"
            data-analytics-name='legend-hide-all'
            className={`stateful-link pull-right ${getActivity(hideIsActive)}`}
            disabled={!hideIsActive}
            onClick={() => {showHideAll('hide', labels, updateShownTraces)}}
          >Hide all</a>
        </div>
      </div>
      {legendEntries}
    </div>
  )
}
