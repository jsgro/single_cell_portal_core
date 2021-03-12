import React, { useState } from 'react'
import Panel from 'react-bootstrap/lib/Panel'
import Select from 'react-select'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretRight, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { SCATTER_COLOR_OPTIONS, defaultScatterColor } from 'components/visualization/ScatterPlot'
import { DISTRIBUTION_PLOT_OPTIONS, DISTRIBUTION_POINTS_OPTIONS } from 'components/visualization/StudyViolinPlot'
import { ROW_CENTERING_OPTIONS, FIT_OPTIONS } from 'components/visualization/Heatmap'

export const defaultExploreParams = {
  scatterColor: undefined,
  distributionPlot: undefined,
  heatmapFit: undefined
}

/** the graph customization controls for the exlore tab */
export default function RenderControls({ exploreParams, updateExploreParams }) {
  const [showScatter, setShowScatter] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showDistribution, setShowDistribution] = useState(false)

  const scatterColorValue = exploreParams.scatterColor ? exploreParams.scatterColor : defaultScatterColor
  let distributionPlotValue = DISTRIBUTION_PLOT_OPTIONS.find(opt => opt.value === exploreParams.distributionPlot)
  if (!distributionPlotValue) {
    distributionPlotValue = DISTRIBUTION_PLOT_OPTIONS[0]
  }
  let heatmapRowCenteringValue = ROW_CENTERING_OPTIONS.find(opt => opt.value === exploreParams.heatmapRowCentering)
  if (!heatmapRowCenteringValue) {
    heatmapRowCenteringValue = ROW_CENTERING_OPTIONS[0]
  }
  let heatmapFitValue = FIT_OPTIONS.find(opt => opt.value === exploreParams.heatmapFit)
  if (!heatmapFitValue) {
    heatmapFitValue = FIT_OPTIONS[0]
  }

  let distributionPointsValue = DISTRIBUTION_POINTS_OPTIONS.find(opt => opt.value === exploreParams.distributionPoints)
  if (!distributionPointsValue) {
    distributionPointsValue = DISTRIBUTION_POINTS_OPTIONS[0]
  }
  return (
    <div className="render-controls">
      <Panel className="controls-scatter" expanded={showScatter} onToggle={() => setShowScatter(!showScatter)}>
        <Panel.Heading onClick={() => setShowScatter(!showScatter)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle scatter display controls"
            data-analytics-name="plot-params-scatter-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showScatter ? faCaretDown : faCaretRight}/>&nbsp;
            Scatter
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="colorscale-picker">Continuous color scale
              <span className="detail"> (for numeric data)</span>
            </label>
            <Select name="colorscale-picker"
              options={SCATTER_COLOR_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              value={{ label: scatterColorValue, value: scatterColorValue }}
              clearable={false}
              onChange={option => updateExploreParams({ scatterColor: option.value })}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel className="controls-distribution"
        expanded={showDistribution}
        onToggle={() => setShowDistribution(!showDistribution)}>
        <Panel.Heading onClick={() => setShowDistribution(!showDistribution)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle distribution display controls"
            data-analytics-name="plot-params-distribution-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showDistribution ? faCaretDown : faCaretRight}/>&nbsp;
            Distribution
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="distribution-plot-picker">Plot type </label>
            <Select name="distribution-plot-picker"
              options={DISTRIBUTION_PLOT_OPTIONS}
              value={distributionPlotValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ distributionPlot: option.value })}/>
            <label htmlFor="distribution-plot-picker">Data points </label>
            <Select name="distribution-points-picker"
              options={DISTRIBUTION_POINTS_OPTIONS}
              value={distributionPointsValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ distributionPoints: option.value })}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel className="controls-heatmap"
        expanded={showHeatmap}
        onToggle={() => setShowHeatmap(!showHeatmap)}>
        <Panel.Heading onClick={() => setShowHeatmap(!showHeatmap)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle heatmap display controls"
            data-analytics-name="plot-params-heatmap-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showHeatmap ? faCaretDown : faCaretRight}/>&nbsp;
            Heatmap
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="row-centering-picker">Row centering </label>
            <Select name="row-centering-picker"
              options={ROW_CENTERING_OPTIONS}
              value={heatmapRowCenteringValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ heatmapRowCentering: option.value })}/>
            <label htmlFor="fit-picker">Fit options </label>
            <Select name="fit-picker"
              options={FIT_OPTIONS}
              value={heatmapFitValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ heatmapFit: option.value })}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </div>
  )
}
