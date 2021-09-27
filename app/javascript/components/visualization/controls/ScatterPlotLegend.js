import React, { useState } from 'react'
import decamelize from 'decamelize'

import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'

import { getColorBrewerColor } from 'lib/plot'

/**
 * Return a hash of value=>count for the passed-in array
 * This is surprisingly quick even for large arrays, but we'd rather we
 * didn't have to do this.  See https://github.com/plotly/plotly.js/issues/5612
*/
function countOccurences(array) {
  return array.reduce((acc, curr) => {
    if (!acc[curr]) {
      acc[curr] = 1
    } else {
      acc[curr] += 1
    }
    return acc
  }, {})
}

/** sort trace names lexically, but always putting 'unspecified' last */
function traceNameSort(a, b) {
  if (a === UNSPECIFIED_ANNOTATION_NAME) {return 1}
  if (b === UNSPECIFIED_ANNOTATION_NAME) {return -1}
  return a.localeCompare(b, 'en', { numeric: true, ignorePunctuation: true })
}

/** Row in legend */
function LegendEntry({ label, numPoints, iconColor, labelCorrelations }) {
  const [isSelected, setIsSelected] = useState(false)

  let entry = `${label} (${numPoints} points)`
  if (labelCorrelations) {
    const correlation = Math.round(labelCorrelations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints}} points, ρ = ${correlation})`
  }

  const id = `legend-entry-${decamelize(label, { separator: '-' })}`

  const iconStyle = { backgroundColor: iconColor }
  const selectedClass = (isSelected ? 'selected' : '')

  return (
    <div
      className={`scp-scatter-legend-row ${selectedClass}`}
      key={id} id={id}
      onClick={() => setIsSelected(!isSelected)}
    >
      <div className="scp-scatter-legend-icon" style={iconStyle}></div>
      <div className="scp-scatter-legend-entry">{entry}</div>
    </div>
  )
}

/** Custom legend for scatter plots */
export default function ScatterPlotLegend({ data, pointSize, labelCorrelations }) {
  console.log('data', data)
  const traceCounts = countOccurences(data.annotations)

  const legendEntries = Object.keys(traceCounts)
    .sort(traceNameSort) // sort keys so we assign colors in the right order
    .map((label, index) => {
      const numPoints = traceCounts[label]
      const iconColor = getColorBrewerColor(index)
      return (
        <LegendEntry
          label={label}
          numPoints={numPoints}
          iconColor={iconColor}
          labelCorrelations={labelCorrelations}
        />
      )
    })

  console.log('legendEntries', legendEntries)

  return <div className="scp-scatter-legend">{ legendEntries }</div>
}
