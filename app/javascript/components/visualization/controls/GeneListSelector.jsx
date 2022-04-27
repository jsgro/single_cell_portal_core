import React from 'react'
import _uniqueId from 'lodash/uniqueId'

import Select from '~/lib/InstrumentedSelect'
import { clusterSelectStyle } from '~/lib/cluster-utils'
import PlotUtils from '~/lib/plot'
const { dotPlotColorScheme } = PlotUtils

// value to render in select menu if user has not selected a gene list
const noneSelected = 'None selected...'

/** takes the server response and returns gene list options suitable for react-select */
function getGeneListOptions(studyGeneLists) {
  const assignLabelsAndValues = geneList => ({ label: geneList.name, value: geneList.name })
  return [{ label: noneSelected, value: '' }].concat(studyGeneLists.map(assignLabelsAndValues))
}


/**
  Renders a gene list selector.
    @param geneList: requested gene list to load.
    @param studyGeneLists: collection of all gene lists for a study
    @param updateGeneList: update function to set the gene list
 */
export default function GeneListSelector({
  geneList,
  studyGeneLists,
  updateGeneList,
  selectLabel='Precomputed heatmaps'
}) {
  if (!studyGeneLists || studyGeneLists.length === 0) {
    return <></>
  }
  const geneListOptions = getGeneListOptions(studyGeneLists)
  const geneListInfo = studyGeneLists.find(gl => gl.name === geneList)
  const isCustomScaling = geneListInfo?.heatmap_file_info?.custom_scaling
  const colorMin = isCustomScaling ? geneListInfo?.heatmap_file_info?.color_min : undefined
  const colorMax = isCustomScaling ? geneListInfo?.heatmap_file_info?.color_max : undefined
  return (
    <div className="form-group">
      <label className="labeled-select">{selectLabel}
        <Select
          data-analytics-name="gene-list-select"
          value={{
            label: geneList === '' ? noneSelected : geneList,
            value: geneList
          }}
          options={geneListOptions}
          styles={clusterSelectStyle}
          onChange={newGeneList => updateGeneList(newGeneList.value)}
        />
      </label>
      { geneList && <GeneListLegend label={geneListInfo.heatmap_file_info?.legend_label} minLabel={colorMin} maxLabel={colorMax}/> }
    </div>
  )
}


/** renders an svg legend for a dotplot with color and size indicators */
function GeneListLegend({ label='Scaled expression', minLabel='min', maxLabel='max' }) {
  const gradientId = _uniqueId('heatmapGrad-')
  const colorBarWidth = 100
  const numberYPos = 56
  const labelTextYPos = 25
  const heatmapColorScheme = {
    // Blue, white, red.  These red and blue hues are accessible, per WCAG.
    colors: ['#0000BB', '#f6f6f6', '#FF0000'],
    values: [0, 0.5, 1]
  }

  return (
    <svg className="heatmap-legend-color">
      <g>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {
            heatmapColorScheme.colors.map((color, i) => {
              const value = dotPlotColorScheme.values[i] * 100
              const offset = `${value}%`
              return <stop offset={offset} stopColor={color} key={i}/>
            })
          }
        </linearGradient>
        <text x="0" y={labelTextYPos}>{label}</text>
        <rect fill={`url(#${gradientId})`} x="0" y="30" width={colorBarWidth} height="14"/>
        <text x="-1" y={numberYPos}>{minLabel}</text>
        <text x={colorBarWidth} y={numberYPos} textAnchor="end">{maxLabel}</text>
      </g>
    </svg>
  )
}
