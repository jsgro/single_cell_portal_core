import React, { useState } from 'react'
import _cloneDeep from 'lodash/cloneDeep'
import jquery from 'jquery'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import Plotly from 'plotly.js-dist'

import * as UserProvider from '~/providers/UserProvider'
import * as ScpApi from 'lib/scp-api'
import ScatterPlot from 'components/visualization/ScatterPlot'
import ScatterPlotLegend from 'components/visualization/controls/ScatterPlotLegend'
import * as ScpApiMetrics from 'lib/scp-api-metrics'
import * as MetricsApi from 'lib/metrics-api'

import '@testing-library/jest-dom/extend-expect'

import { BASIC_PLOT_DATA, MANY_LABELS_MOCKS, COUNTS_BY_LABEL } from './scatter-plot.test-data'

const CACHE_PERF_PARAMS = {
  legacyBackend: 0,
  parse: 0,
  url: 'cache'
}

const BASIC_DIMENSION_PROPS = {
  isMultiRow: false,
  isTwoColumn: false,
  showRelatedGenesIdeogram: false,
  showViewOptionsControls: true
}

beforeAll(() => {
  global.$ = jquery
})
// Note: tests that mock global.fetch must be cleared after every test
afterEach(() => {
  // Restores all mocks back to their original value
  jest.restoreAllMocks()
})


it('shows custom legend with default group scatter plot', async () => {
  const apiFetch = jest.spyOn(ScpApi, 'fetchCluster')
  // pass in a clone of the response since it may get modified by the cache operations
  apiFetch.mockImplementation(params => {
    const response = _cloneDeep(MANY_LABELS_MOCKS.CLUSTER_RESPONSE)
    response.cluster = params.cluster
    response.genes = params.genes
    return Promise.resolve([response, CACHE_PERF_PARAMS])
  })
  const fakePlot = jest.spyOn(Plotly, 'react')
  fakePlot.mockImplementation((id, traces, layout) => {
    // graph updates are often done in-place using the plotly data stored on the element
    // so we put it there
    document.getElementById(id).data = traces
  })
  const fakeLogScatter = jest.spyOn(ScpApiMetrics, 'logScatterPlot')
  fakeLogScatter.mockImplementation(() => {})

  const fakeLog = jest.spyOn(MetricsApi, 'log')
  fakeLog.mockImplementation(() => {})

  const countsByLabel = COUNTS_BY_LABEL

  /** shim for the explore view component that only handles passing hiddenTraces */
  function ExploreShim() {
    const [exploreParams, setExploreParams] = useState({ hiddenTraces: [] })
    return <ScatterPlot studyAccession='SCP101'
      {...{
        cluster: 'cluster_many_long_odd_labels.tsv',
        annotation: {
          name: 'Category',
          type: 'group',
          scope: 'cluster'
        },
        subsample: 'all',
        consensus: null,
        genes: [],
        dimensionProps: BASIC_DIMENSION_PROPS,
        setCountsByLabel() {},
        countsByLabel,
        hiddenTraces: exploreParams.hiddenTraces,
        updateExploreParams: newParams => setExploreParams(newParams)
      }}/>
  }

  const { container } = render(<ExploreShim/>)

  // findByTestId would be more kosher, but the numerical leaf ("1") is
  // assigned randomly in `ScatterPlot`.  This ID has been observed with the
  // value "study-scatter-25", but relying on that seems brittle.
  //
  // Consider changing `ScatterPlot` to use a deterministic `data-testid`.
  // await screen.findByTestId('study-scatter-1-legend')

  await waitFor(() => {
    container.querySelectorAll('#study-scatter-1-legend').length > 0
  })

  const legendRows = container.querySelectorAll('.scatter-legend-row')
  expect(legendRows).toHaveLength(31)

  // Show all should be disabled when all traces are already shown
  const showAllButton = await screen.findByText('Show all')
  expect(showAllButton).toHaveAttribute('disabled')

  // Click a legend label to hide the corresponding trace
  fireEvent.click(screen.getByText('An_underscored_label'))

  // Wait for show all to not be disabled
  await waitFor(() => expect(screen.getByText('Show all')).not.toHaveAttribute('disabled'))

  // Test analytics
  expect(fakeLog).toHaveBeenCalledWith(
    'click:scatterlegend:single',
    {
      label: 'An_underscored_label',
      numPoints: 19,
      numLabels: 31,
      wasShown: true,
      iconColor: '#377eb8',
      hasCorrelations: false
    }
  )
})

it('shows cluster external link', async () => {
  const scatterData = BASIC_PLOT_DATA.scatter
  const countsByLabel = COUNTS_BY_LABEL

  render((<ScatterPlotLegend
    name={scatterData.annotParams.name}
    height={scatterData.height}
    countsByLabel={countsByLabel}
    hiddenTraces={[]}
    hasArrayLabels={scatterData.hasArrayLabels}
    externalLink={BASIC_PLOT_DATA.externalLink}
  />))

  const { container } = render(<ScatterPlot/>)

  await waitFor(() => {
    container.querySelectorAll('#study-scatter-1-legend').length > 0
  })

  const externalLink = await screen.findByText('link display text')
  expect(externalLink).toBeTruthy()
})

it('shows legend search', async () => {
  const scatterData = BASIC_PLOT_DATA.scatter
  const countsByLabel = COUNTS_BY_LABEL
  jest
    .spyOn(UserProvider, 'getFeatureFlagsWithDefaults')
    .mockReturnValue({
      legend_search: true
    })

  render((
    <ScatterPlotLegend
      name={scatterData.annotParams.name}
      height={scatterData.height}
      countsByLabel={countsByLabel}
      hiddenTraces={[]}
      hasArrayLabels={scatterData.hasArrayLabels}
      externalLink={BASIC_PLOT_DATA.externalLink}
    />))

  const labelSearchBox = await screen.findByPlaceholderText('Search')
  expect(labelSearchBox).toBeTruthy()
})

describe('getPlotlyTraces handles expression graphs', () => {
  it('sorts points in order of expression', async () => {
    const plotData = _cloneDeep(BASIC_PLOT_DATA)
    plotData.scatter.data.expression = [0.1, 0.0, 2, 4.5, 0, 6.5, 0, 3.1]
    plotData.genes = ['foo']

    const [traces] = ScatterPlot.getPlotlyTraces(plotData)
    // should return just a single trace, since we are plotting by expression rather than annotation
    expect(traces).toHaveLength(1)
    const trace = traces[0]
    expect(trace.type).toEqual('scattergl')
    expect(trace.x).toEqual([2, 5, 7, 1, 3, 8, 4, 6])
    expect(trace.y).toEqual([2, 5, 7, 1, 3, 8, 4, 6])
    expect(trace.marker.color).toEqual([0, 0, 0.0, 0.1, 2, 3.1, 4.5, 6.5])
    expect(trace.cells).toEqual(['B', 'E', 'G', 'A', 'C', 'H', 'D', 'F'])
    expect(trace.annotations).toEqual(['s1', 's2', 's1', 's1', 's1', 's2', 's1', 's2'])
    expect(trace.hovertemplate).toEqual('(%{x}, %{y})<br>%{text} (%{meta})<br>Expression: %{marker.color}<extra></extra>')
  })

  it('resets the limits in cases of all zero expression', async () => {
    const plotData = _cloneDeep(BASIC_PLOT_DATA)
    plotData.scatter.data.expression = [0, 0, 0, 0, 0, 0, 0, 0]
    plotData.genes = ['foo']

    const [traces] = ScatterPlot.getPlotlyTraces(plotData)
    const trace = traces[0]
    expect(trace.marker.cmin).toEqual(0)
    expect(trace.marker.cmax).toEqual(1)
  })

  it('reverses the colors of non-Reds color scales', async () => {
    const plotData = _cloneDeep(BASIC_PLOT_DATA)
    plotData.scatter.data.expression = [0, 0, 0, 0, 0, 0, 0, 0]
    plotData.genes = ['foo']

    let [traces] = ScatterPlot.getPlotlyTraces(plotData)
    // check that it doesn't reverse Reds when Reds is applied as the default
    // Note that if the defaultScatterColor is ever changed to a non-Reds colorscale,
    // this test will need to be updated
    expect(traces[0].marker.reversescale).toEqual(false)

    // check that does not reverse Reds when that is the explicitly specified colorscale
    plotData.scatterColor = 'Reds'
    traces = ScatterPlot.getPlotlyTraces(plotData)[0]
    expect(traces[0].marker.reversescale).toEqual(false)

    // check that it does reverse a non-Reds color scale that is specified
    plotData.scatterColor = 'Greens'
    traces = ScatterPlot.getPlotlyTraces(plotData)[0]
    expect(traces[0].marker.reversescale).toEqual(true)
  })
})
