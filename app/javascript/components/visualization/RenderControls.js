import React, { useState } from 'react'
import Panel from 'react-bootstrap/lib/Panel'
import Select from 'react-select'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretRight, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { SCATTER_COLOR_OPTIONS } from 'components/visualization/ScatterPlot'
import { DISTRIBUTION_PLOT_OPTIONS } from 'components/visualization/StudyViolinPlot'

export const defaultRenderParams = {
  scatterColor: undefined,
  distributionPlot: undefined
}

/** the graph customization controls for the exlore tab */
export default function RenderControls({ renderParams, updateRenderParams }) {
  const [showScatter, setShowScatter] = useState(false)
  const [showDistribution, setShowDistribution] = useState(false)

  const scatterColorValue = renderParams.scatterColor ? renderParams.scatterColor : ' '
  let distributionPlotValue = DISTRIBUTION_PLOT_OPTIONS.find(opt => opt.value === renderParams.distributionPlot)
  if (!distributionPlotValue) {
    distributionPlotValue = ' '
  }
  return (
    <div className="render-controls">
      <Panel className="render-scatter" expanded={showScatter} onToggle={() => setShowScatter(!showScatter)}>
        <Panel.Heading onClick={() => setShowScatter(!showScatter)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle scatter display controls"
            data-analytics-name="render-params-scatter-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showScatter ? faCaretDown : faCaretRight}/>&nbsp;
            Scatter
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="colorscale-picker">Color profile</label>
            <Select name="colorscale-picker"
              options={SCATTER_COLOR_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              value={{ label: scatterColorValue, value: scatterColorValue }}
              clearable={false}
              onChange={option => updateRenderParams({ scatterColor: option.value })}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel className="render-distribution"
        expanded={showDistribution}
        onToggle={() => setShowDistribution(!showDistribution)}>
        <Panel.Heading onClick={() => setShowDistribution(!showDistribution)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle distribution display controls"
            data-analytics-name="render-params-distribution-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showDistribution ? faCaretDown : faCaretRight}/>&nbsp;
            Distribution
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="colorscale-picker">Plot type </label>
            <Select name="colorscale-picker"
              options={DISTRIBUTION_PLOT_OPTIONS}
              value={distributionPlotValue}
              clearable={false}
              onChange={option => updateRenderParams({ distributionPlot: option.value })}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </div>
  )
}
