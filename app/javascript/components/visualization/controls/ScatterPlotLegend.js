import React, { useState } from 'react'
import _kebabCase from 'lodash/kebabCase'
import _remove from 'lodash/remove'

import { UNSPECIFIED_ANNOTATION_NAME } from 'lib/cluster-utils'
import { getColorBrewerColor } from 'lib/plot'

/** Sort annotation labels naturally, but always put "unspecified" last */
function labelSort(a, b) {
  if (a === UNSPECIFIED_ANNOTATION_NAME) {return 1}
  if (b === UNSPECIFIED_ANNOTATION_NAME) {return -1}
  return a.localeCompare(b, 'en', { numeric: true, ignorePunctuation: true })
}

/** Handle user interaction with a filter */
function updateSelection(props, filterId, value) {
  const newSelection = props.selection.slice()
  if (value && !newSelection.includes(filterId)) {
    newSelection.push(filterId)
  }
  if (!value) {
    _remove(newSelection, id => {return id === filterId})
  }
  props.setSelection(newSelection)
}

/** Row in legend */
function LegendEntry({
  label, numPoints, iconColor, labelCorrelations,
  selection, setSelection
}) {
  let entry = `${label} (${numPoints} points)`
  if (labelCorrelations) {
    const correlation = Math.round(labelCorrelations[label] * 100) / 100

    // ρ = rho = Spearman's rank correlation coefficient
    entry = `${label} (${numPoints}} points, ρ = ${correlation})`
  }

  const id = _kebabCase(label)
  const domId = `legend-entry-${id}`

  const isSelected = selection.includes(id)

  const iconStyle = { backgroundColor: iconColor }
  const selectedClass = (isSelected ? 'selected' : '')

  /** Toggle state of this legend filter, and accordingly upstream */
  function toggleSelection() {
    const state = !isSelected
    selection[label] = state
    updateSelection({ selection, setSelection }, id, state)
  }

  return (
    <div
      className={`scatter-legend-row ${selectedClass}`}
      key={domId} id={domId}
      onClick={() => toggleSelection()}
    >
      <div className="scatter-legend-icon" style={iconStyle}></div>
      <div className="scatter-legend-entry">{entry}</div>
    </div>
  )
}

/** Custom legend for scatter plots */
export default function ScatterPlotLegend({ name, countsByLabel, correlations }) {
  const [selection, setSelection] = useState([])

  console.log('name, countsByLabel, correlations', name, countsByLabel, correlations)

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
          selection={selection}
          setSelection={setSelection}
        />
      )
    })

  console.log('selections', selection)

  console.log('legendEntries', legendEntries)

  console.log('selections', selection)
  const filteredClass = (selection.length > 0) ? 'filtered' : ''
  return (
    <div className={`scatter-legend ${filteredClass}`}>
      <p className="scatter-legend-name">{name}</p>
      {legendEntries}
    </div>
  )
}
