import React, { useState } from 'react'
import Panel from 'react-bootstrap/lib/Panel'
import Select from 'react-select'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretRight, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { SCATTER_COLOR_OPTIONS, defaultScatterColor } from 'components/visualization/ScatterPlot'

export const defaultRenderParams = {
  scatterColor: defaultScatterColor
}

/** the graph customization controls for the exlore tab */
export default function RenderControls({ renderParams, updateRenderParams }) {
  const [showScatter, setShowScatter] = useState(false)
  return (
    <div className="render-controls">
      <Panel className="render-scatter" expanded={showScatter} onToggle={() => setShowScatter(!showScatter)}>
        <Panel.Heading onClick={() => setShowScatter(!showScatter)}>
          <Panel.Title className="action"
            componentClass="a"
            title="toggle scatter display controls"
            data-analytics-name="render-params-scatter-toggle">
            <FontAwesomeIcon className="fa-lg" icon={showScatter ? faCaretDown : faCaretRight }/>&nbsp;
            Scatter
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <label htmlFor="colorscale-picker">Color profile</label>
            <Select name="colorscale-picker"
              options={SCATTER_COLOR_OPTIONS.map(color => ({ label: color, value: color }))}
              value={{ label: renderParams.scatterColor, value: renderParams.scatterColor }}
              clearable={false}
              onChange={option => updateRenderParams({scatterColor: option.value})}/>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </div>
  )
}
