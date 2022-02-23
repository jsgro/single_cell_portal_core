import React from 'react'
import Panel from 'react-bootstrap/lib/Panel'

import Select from '~/lib/InstrumentedSelect'
import { SCATTER_COLOR_OPTIONS, defaultScatterColor } from '~/components/visualization/ScatterPlot'
import { DISTRIBUTION_PLOT_OPTIONS, DISTRIBUTION_POINTS_OPTIONS } from '~/components/visualization/StudyViolinPlot'
import { ROW_CENTERING_OPTIONS, FIT_OPTIONS } from '~/components/visualization/Heatmap'

export const defaultExploreParams = {
  scatterColor: undefined,
  distributionPlot: undefined,
  heatmapFit: undefined
}

/** the graph customization controls for the exlore tab */
export default function RenderControls({ shownTab, exploreParams, updateExploreParams }) {
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

  const showScatter = shownTab === 'scatter' &&
                      (exploreParams.annotation.type === 'numeric' || exploreParams.genes.length)

  return (
    <div className="render-controls">
      <Panel className={showScatter ? '' : 'hidden'}>
        <Panel.Heading>
          <Panel.Title>
            Scatter
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <label className="labeled-select">Continuous color scale
            <span className="detail"> (for numeric data)</span>
            <Select
              data-analytics-name="scatter-color-picker"
              options={SCATTER_COLOR_OPTIONS.map(opt => ({ label: opt, value: opt }))}
              value={{ label: scatterColorValue, value: scatterColorValue }}
              clearable={false}
              onChange={option => updateExploreParams({ scatterColor: option.value })}/>
          </label>
        </Panel.Body>
      </Panel>
      <Panel className={shownTab === 'distribution' ? '' : 'hidden'}>
        <Panel.Heading>
          <Panel.Title>
            Distribution
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <label className="labeled-select">Plot type
            <Select data-analytics-name="distribution-plot-picker"
              options={DISTRIBUTION_PLOT_OPTIONS}
              value={distributionPlotValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({
                distributionPlot: option.value,
                distributionPoints: distributionPointsValue.value
              })}/>
          </label>
          <label className="labeled-select">Data points
            <Select data-analytics-name="distribution-points-picker"
              options={DISTRIBUTION_POINTS_OPTIONS}
              value={distributionPointsValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({
                distributionPlot: distributionPlotValue.value,
                distributionPoints: option.value
              })}/>
          </label>
        </Panel.Body>
      </Panel>
      <Panel className={shownTab === 'heatmap' ? '' : 'hidden'}>
        <Panel.Heading>
          <Panel.Title>
            Heatmap
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <label className="labeled-select">Row centering
            <Select data-analytics-name="row-centering-picker"
              options={ROW_CENTERING_OPTIONS}
              value={heatmapRowCenteringValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ heatmapRowCentering: option.value })}/>
          </label>
          <label className="labeled-select">Fit options
            <Select data-analytics-name="fit-picker"
              options={FIT_OPTIONS}
              value={heatmapFitValue}
              clearable={false}
              isSearchable={false}
              onChange={option => updateExploreParams({ heatmapFit: option.value })}/>
          </label>
        </Panel.Body>
      </Panel>
    </div>
  )
}
