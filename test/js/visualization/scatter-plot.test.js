import _cloneDeep from 'lodash/cloneDeep'
import '@testing-library/jest-dom/extend-expect'

import { getPlotlyTraces } from 'components/visualization/ScatterPlot'

const BASIC_PLOT_DATA = {
  axes: {
    aspects: null,
    titles: {
      magnitude: 'Expression',
      x: 'X',
      y: 'Y',
      z: 'Z'
    }
  },
  scatter: {
    annotParams: {
      name: 'Category',
      type: 'group',
      scope: 'cluster'
    },
    genes: ['foo']
  },
  isAnnotatedScatter: false,
  isCorrelatedScatter: false,
  scatterColor: '',
  dataScatterColor: undefined,
  pointSize: 3,
  pointAlpha: 1,
  is3d: false,
  annotType: 'group',
  annotName: 'biosample_id',
  data: {
    x: [1, 2, 3, 4, 5, 6, 7, 8],
    y: [1, 2, 3, 4, 5, 6, 7, 8],
    cells: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    annotations: ['s1', 's1', 's1', 's1', 's2', 's2', 's1', 's2']
  }
}


describe('getPlotlyTraces handles expression graphs', () => {
  it('sorts points in order of expression', async () => {
    const plotData = _cloneDeep(BASIC_PLOT_DATA)
    plotData.data.expression = [0.1, 0.0, 2, 4.5, 0, 6.5, 0, 3.1]
    plotData.genes = ['foo']

    const traces = getPlotlyTraces(plotData)
    expect(traces).toHaveLength(2)
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
    plotData.data.expression = [0, 0, 0, 0, 0, 0, 0, 0]
    plotData.genes = ['foo']

    const traces = getPlotlyTraces(plotData)
    const trace = traces[0]
    expect(trace.marker.cmin).toEqual(0)
    expect(trace.marker.cmax).toEqual(1)
  })
})


