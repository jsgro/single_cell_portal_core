import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
import _remove from 'lodash/remove'
import Plotly from 'plotly.js-dist'

import { fetchCluster } from 'lib/scp-api'
import { logScatterPlot } from 'lib/scp-api-metrics'
import { log } from 'lib/metrics-api'
import { useUpdateEffect } from 'hooks/useUpdate'
import PlotTitle from './PlotTitle'
import ScatterPlotLegend, { getStyles } from './controls/ScatterPlotLegend'
import useErrorMessage from 'lib/error-message'
import { computeCorrelations } from 'lib/stats'
import { withErrorBoundary } from 'lib/ErrorBoundary'
import { getFeatureFlagsWithDefaults } from 'providers/UserProvider'


// sourced from https://github.com/plotly/plotly.js/blob/master/src/components/colorscale/scales.js
export const SCATTER_COLOR_OPTIONS = [
  'Greys', 'YlGnBu', 'Greens', 'YlOrRd', 'Bluered', 'RdBu', 'Reds', 'Blues', 'Picnic',
  'Rainbow', 'Portland', 'Jet', 'Hot', 'Blackbody', 'Earth', 'Electric', 'Viridis', 'Cividis'
]

export const defaultScatterColor = 'Reds'
window.Plotly = Plotly

/** Renders the appropriate scatter plot for the given study and params
  * @param studyAccession {string} e.g. 'SCP213'
  * @param cluster {string} the name of the cluster, or blank/null for the study's default
  * @param annotation {obj} an object with name, type, and scope attributes
  * @param subsample {string} a string for the subsample to be retrieved.
  * @param consensus {string} for multi-gene expression plots
  * @param dimensions {obj} object with height and width, to instruct plotly how large to render itself
  *   this is useful for rendering to hidden divs
  * @param isCellSelecting whether plotly's lasso selection tool is enabled
  * @plotPointsSelected {function} callback for when a user selects points on the plot, which corresponds
  *   to the plotly "points_selected" event
  */
function RawScatterPlot({
  studyAccession, cluster, annotation, subsample, consensus, genes, scatterColor, dimensions,
  isAnnotatedScatter=false, isCorrelatedScatter=false, isCellSelecting=false, plotPointsSelected, dataCache
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [bulkCorrelation, setBulkCorrelation] = useState(null)
  const [labelCorrelations, setLabelCorrelations] = useState(null)
  const [scatterData, setScatterData] = useState(null)
  const [countsByLabel, setCountsByLabel] = useState(null)
  const [filters, setFilters] = useState([])
  const [showHideButtons, setShowHideButtons] = useState(['disabled', 'active'])
  const [allHidden, setAllHidden] = useState(false)
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()


  // 3 filterable labels available:
  // labels = [A, B, C]
  //
  // describe('When no filters are selected, all labels are shown, and clicking a label hides unfiltered', () => {
  //   if (filters.length === 0) {
  //     click('A')
  //     assert($('#legend-entry-a').hasClass('hidden') === false)
  //     assert(filters.length === 1 && filters[0] === 'a')
  //   }
  //  })
  //
  // describe('When some but not all filters are selected, clicking a label still hides unfiltered', () => {
  // if (filters.length > 0 && filters.length < labels.length) {
  //   click('B')
  //   assert($('#legend-entry-b').hasClass('hidden') === false)
  //   assert(filters.length === 2 && filters.includes('a') && filters.includes('b'))
  // }
  // })
  //
  // describe('When all filters are selected, no labels are shown, and clicking a label removes that filter and shows it', () => {
  // if (filters.length === labels.length) {
  //   assert(filters.length === 3)
  //   assert($('#legend-entry-a').hasClass('hidden'))
  //   click('A')
  //   assert(filters.length === 2)
  //   assert($('#legend-entry-a').hasClass('hidden') === false)
  // }
  // })

  /** Handle user interaction with one or more filters */
  function updateFilters(filterIds, hide, numLabels) {
    let newFilters
    const isShowOrHideAll = Array.isArray(filterIds)
    if (isShowOrHideAll) {
      // Handle multi-filter interaction
      if (!hide) {
        newFilters = []
        setShowHideButtons(['disabled', 'active'])
      } else {
        newFilters = filterIds
        setShowHideButtons(['active', 'disabled'])
      }
    } else {
      // Handle single-filter interaction
      const filterId = filterIds
      if (allHidden) {
        newFilters = [filterId]
      } else {
        newFilters = filters.slice()

        if (hide && !newFilters.includes(filterId)) {
          newFilters.push(filterId)
        }
        if (!hide) {
          _remove(newFilters, id => {return id === filterId})
        }
      }
      const numFilters = newFilters.length
      if (numFilters > 0 && numFilters < numLabels) {
        setShowHideButtons(['active', 'active'])
      } else if (numFilters === 0) {
        setShowHideButtons(['active', 'disabled'])
      } else if (numFilters === numLabels) {
        setShowHideButtons(['disabled', 'active'])
      }
    }

    setFilters(newFilters)

    const newAllHidden = (isShowOrHideAll && hide)
    setAllHidden(newAllHidden)

    console.log('newFilters', newFilters)
  }

  window.debugFilters = filters

  /** Process scatter plot data fetched from server */
  function handleResponse(clusterResponse) {
    const [scatter, perfTimes] = clusterResponse
    const layout = getPlotlyLayout(dimensions, scatter)

    const traceArgs = {
      axes: scatter.axes,
      data: scatter.data,
      annotName: scatter.annotParams.name,
      annotType: scatter.annotParams.type,
      genes: scatter.genes,
      isAnnotatedScatter: scatter.isAnnotatedScatter,
      isCorrelatedScatter: scatter.isCorrelatedScatter,
      scatterColor,
      dataScatterColor: scatter.scatterColor,
      pointAlpha: scatter.pointAlpha,
      pointSize: scatter.pointSize,
      showPointBorders: scatter.showClusterPointBorders,
      is3D: scatter.is3D,
      labelCorrelations,
      filters,
      allHidden
    }
    const [traces, labelCounts] = getPlotlyTraces(traceArgs)
    const plotlyTraces = [traces]
    setCountsByLabel(labelCounts)

    const startTime = performance.now()
    Plotly.react(graphElementId, plotlyTraces, layout)

    perfTimes.plot = performance.now() - startTime

    logScatterPlot({
      scatter, genes, width: dimensions.width, height: dimensions.height
    }, perfTimes)

    if (isCorrelatedScatter) {
      const rhoStartTime = performance.now()

      // Compute correlations asynchronously, to not block other rendering
      computeCorrelations(scatter).then(correlations => {
        const rhoTime = Math.round(performance.now() - rhoStartTime)
        setBulkCorrelation(correlations.bulk)
        const flags = getFeatureFlagsWithDefaults()
        if (flags.correlation_refinements) {
          setLabelCorrelations(correlations.byLabel)
        }
        log('plot:correlations', { perfTime: rhoTime })
      })
    }

    setScatterData(scatter)
    setShowError(false)
    setIsLoading(false)
  }

  // Fetches plot data then draws it, upon load or change of any data parameter
  useEffect(() => {
    setIsLoading(true)
    // use a data cache if one has been provided, otherwise query scp-api directly
    const fetchMethod = dataCache ? dataCache.fetchCluster : fetchCluster
    fetchMethod({
      studyAccession,
      cluster,
      annotation: annotation ? annotation : '',
      subsample,
      consensus,
      genes,
      isAnnotatedScatter,
      isCorrelatedScatter
    }).then(handleResponse).catch(error => {
      Plotly.purge(graphElementId)
      setErrorContent(error.message)
      setShowError(true)
      setIsLoading(false)
    })
  }, [cluster, annotation.name, subsample, consensus, genes.join(','), isAnnotatedScatter, filters])

  // Handles Plotly `data` updates, e.g. changes in color profile
  useUpdateEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (scatterData && !isLoading) {
      const dataUpdate = { 'marker.colorscale': scatterColor }
      Plotly.update(graphElementId, dataUpdate)
    }
  }, [scatterColor])

  // Handles cell select mode updates
  useUpdateEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (scatterData && !isLoading) {
      const newDragMode = getDragMode(isCellSelecting)
      Plotly.relayout(graphElementId, { dragmode: newDragMode })
      if (!isCellSelecting) {
        Plotly.restyle(graphElementId, { selectedpoints: [null] })
      }
    }
  }, [isCellSelecting])

  // Adjusts width and height of plots upon toggle of "View Options"
  useUpdateEffect(() => {
    // Don't update if the graph hasn't loaded yet
    if (scatterData && !isLoading) {
      const { width, height } = dimensions
      const layoutUpdate = { width, height }
      Plotly.relayout(graphElementId, layoutUpdate)
    }
  }, [dimensions.width, dimensions.height])


  useEffect(() => {
    const jqScatterGraph = $(`#${graphElementId}`)
    jqScatterGraph.on('plotly_selected', plotPointsSelected)
    jqScatterGraph.on('plotly_legendclick', logLegendClick)
    jqScatterGraph.on('plotly_legenddoubleclick', logLegendDoubleClick)
    return () => {
      jqScatterGraph.off('plotly_selected')
      jqScatterGraph.off('plotly_legendclick')
      jqScatterGraph.off('plotly_legenddoubleclick')
      Plotly.purge(graphElementId)
    }
  }, [])

  return (
    <div className="plot">
      { ErrorComponent }
      { scatterData &&
        <PlotTitle
          cluster={scatterData.cluster}
          annotation={scatterData.annotParams.name}
          subsample={scatterData.subsample}
          genes={scatterData.genes}
          consensus={scatterData.consensus}
          isCorrelatedScatter={isCorrelatedScatter}
          correlation={bulkCorrelation}/>
      }
      <div
        className="scatter-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
        { scatterData &&
        <ScatterPlotLegend
          name={scatterData.annotParams.name}
          countsByLabel={countsByLabel}
          correlations={labelCorrelations}
          filters={filters}
          updateFilters={updateFilters}
          showHideButtons={showHideButtons}
          allHidden={allHidden}
        />
        }
      </div>
      <p className="help-block">
        { scatterData && scatterData.description &&
          <span>{scatterData.description}</span>
        }
      </p>
      {
        isLoading &&
        <FontAwesomeIcon
          icon={faDna}
          data-testid={`${graphElementId}-loading-icon`}
          className="gene-load-spinner"
        />
      }
    </div>
  )
}

const ScatterPlot = withErrorBoundary(RawScatterPlot)
export default ScatterPlot

/** get the array of plotly traces for plotting */
function getPlotlyTraces({
  axes,
  data,
  annotType,
  annotName,
  genes,
  isAnnotatedScatter,
  isCorrelatedScatter,
  scatterColor,
  dataScatterColor,
  pointAlpha,
  pointSize,
  showPointBorders,
  is3D,
  filters,
  allHidden
}) {
  const trace = {
    type: is3D ? 'scatter3d' : 'scattergl',
    mode: 'markers',
    x: data.x,
    y: data.y,
    annotations: data.annotations,
    cells: data.cells,
    opacity: pointAlpha ? pointAlpha : 1
  }
  if (is3D) {
    trace.z = data.z
  }

  let countsByLabel = null

  const appliedScatterColor = getScatterColorToApply(dataScatterColor, scatterColor)
  const isGeneExpressionForColor = genes.length && !isCorrelatedScatter
  if (annotType === 'group' && !isGeneExpressionForColor) {
    // use plotly's groupby transformation to make the traces
    const [legendStyles, labelCounts] = getStyles(data, pointSize)
    countsByLabel = labelCounts
    trace.transforms = [
      {
        type: 'groupby',
        groups: data.annotations,
        styles: legendStyles
      }
    ]

    console.log('in getPlotlyTraces. filters:', filters)
    if (filters.length > 0 && !allHidden) {
      trace.transforms.push({
        type: 'filter',
        target: data.annotations,
        // For available operations, see:
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/transforms/filter.js
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/constants/filter_ops.js
        // Plotly docs are rather sparse here.
        operation: '{}',
        value: filters
      })
    }

    if (filters.length > 0 && allHidden) {
      trace.transforms.push({
        type: 'filter',
        target: data.annotations,
        // For available operations, see:
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/transforms/filter.js
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/constants/filter_ops.js
        // Plotly docs are rather sparse here.
        operation: '}{',
        value: filters
      })
    }
  } else {
    trace.marker = {
      line: { color: 'rgb(40,40,40)', width: 0 },
      size: pointSize
    }
    const colors = isGeneExpressionForColor ? data.expression : data.annotations
    const title = isGeneExpressionForColor ? axes.titles.magnitude : annotName
    if (!isAnnotatedScatter) {
      Object.assign(trace.marker, {
        showscale: true,
        colorscale: appliedScatterColor,
        color: colors,
        colorbar: { title, titleside: 'right' }
      })
      // if expression values are all zero, set max/min manually so the zeros still look like zero
      // see SCP-2957
      if (genes.length && !colors.some(val => val !== 0)) {
        trace.marker.cmin = 0
        trace.marker.cmax = 1
      }
    }
  }
  addHoverLabel(trace, annotName, annotType, genes, isAnnotatedScatter, isCorrelatedScatter, axes)

  return [trace, countsByLabel]
}

/** makes the data trace attributes (cells, trace name) available via hover text */
function addHoverLabel(trace, annotName, annotType, genes, isAnnotatedScatter, isCorrelatedScatter, axes) {
  trace.text = trace.cells
  // use the 'meta' property so annotations are exposed to the hover template
  // see https://community.plotly.com/t/hovertemplate-does-not-show-name-property/36139
  trace.meta = trace.annotations
  let groupHoverTemplate = '(%{x}, %{y})<br><b>%{text}</b><br>%{meta}<extra></extra>'
  if (isAnnotatedScatter) {
    // for annotated scatter, just show coordinates and cell name
    groupHoverTemplate = `(%{x}, %{y})<br>%{text}`
  } else if ((annotType === 'numeric' || genes.length) && !isCorrelatedScatter) {
    // this is a graph with a continuous color scale
    // the bottom row of the hover will either be the expression value, or the annotation value
    const bottomRowLabel = genes.length ? axes.titles.magnitude : annotName
    groupHoverTemplate = `(%{x}, %{y})<br>%{text} (%{meta})<br>${bottomRowLabel}: %{marker.color}<extra></extra>`
  }
  trace.hovertemplate = groupHoverTemplate
}

/** Gets color on the given traces.  If no color is specified, use color from data */
function getScatterColorToApply(dataScatterColor, scatterColor) {
  // Set color scale
  if (!scatterColor) {
    scatterColor = dataScatterColor
  }
  return scatterColor
}

/** Gets Plotly layout object for scatter plot */
function getPlotlyLayout({ width, height }={}, {
  axes,
  userSpecifiedRanges,
  hasCoordinateLabels,
  coordinateLabels,
  isAnnotatedScatter,
  isCorrelatedScatter,
  is3D,
  isCellSelecting=false,
  genes,
  annotParams
}) {
  const layout = {
    hovermode: 'closest',
    // font: labelFont,
    dragmode: getDragMode(isCellSelecting)
  }
  if (is3D) {
    layout.scene = get3DScatterProps({
      userSpecifiedRanges, axes, hasCoordinateLabels,
      coordinateLabels
    })
  } else {
    const props2d = get2DScatterProps({
      axes,
      userSpecifiedRanges,
      hasCoordinateLabels,
      coordinateLabels,
      isAnnotatedScatter,
      isCorrelatedScatter
    })
    Object.assign(layout, props2d)
  }
  if (annotParams && annotParams.name) {
    // layout.legend = {
    //   itemsizing: 'constant',
    //   title: { text: annotParams.name },
    //   y: 0.94
    // }
  }
  layout.showlegend = false
  layout.width = width
  layout.height = height
  return layout
}

/** Gets Plotly layout object for two-dimensional scatter plot */
function get2DScatterProps({
  axes,
  userSpecifiedRanges,
  hasCoordinateLabels,
  coordinateLabels,
  isAnnotatedScatter,
  isCorrelatedScatter
}) {
  const { titles } = axes

  const layout = {
    xaxis: { title: titles.x, range: axes?.ranges?.x },
    yaxis: { title: titles.y, range: axes?.ranges?.y }
  }

  if (isAnnotatedScatter === false && isCorrelatedScatter === false) {
    layout.xaxis.showticklabels = false
    layout.yaxis.scaleanchor = 'x'
    layout.yaxis.showticklabels = false
    layout.margin = {
      t: 10,
      r: 0,
      b: 20,
      l: 0
    }
  } else {
    layout.margin = {
      t: 10,
      r: 0,
      b: 50,
      l: 50
    }
  }

  // if user has supplied a range, set that, otherwise let Plotly autorange
  if (userSpecifiedRanges) {
    layout.xaxis.range = userSpecifiedRanges.x
    layout.yaxis.range = userSpecifiedRanges.y
  } else {
    layout.xaxis.autorange = true
    layout.yaxis.autorange = true
  }

  if (hasCoordinateLabels && !isAnnotatedScatter && !isCorrelatedScatter) {
    // don't show coordinate labels on annotated scatters, since the axes are different
    layout.annotations = coordinateLabels
  }

  return layout
}

const baseCamera = {
  up: { x: 0, y: 0, z: 1 },
  center: { x: 0, y: 0, z: 0 },
  eye: { x: 1.25, y: 1.25, z: 1.25 }
}

/** Gets Plotly layout scene props for 3D scatter plot */
export function get3DScatterProps({
  userSpecifiedRanges, axes, hasCoordinateLabels,
  coordinateLabels
}) {
  const { titles, aspects } = axes

  const scene = {
    baseCamera,
    aspectmode: 'cube',
    xaxis: { title: titles.x, autorange: true, showticklabels: false },
    yaxis: { title: titles.y, autorange: true, showticklabels: false },
    zaxis: { title: titles.z, autorange: true, showticklabels: false }
  }

  if (userSpecifiedRanges) {
    scene.xaxis.autorange = false
    scene.xaxis.range = userSpecifiedRanges.x
    scene.yaxis.autorange = false
    scene.yaxis.range = userSpecifiedRanges.y
    scene.zaxis.autorange = false
    scene.zaxis.range = userSpecifiedRanges.z
    scene.aspectmode = aspects.mode,
    scene.aspectratio = {
      x: aspects.x,
      y: aspects.y,
      z: aspects.z
    }
  }

  if (hasCoordinateLabels) {
    scene.annotations = coordinateLabels
  }

  return scene
}

/** get the appropriate plotly dragmode option string */
function getDragMode(isCellSelecting) {
  return isCellSelecting ? 'lasso' : 'lasso, select'
}


let currentClickCall = null

/** we don't want to fire two single click events for a double click, so
 * we wait until we've confirmed a click isn't a double click before logging it.
 * Unfortunately (despite the docs indicating otherwise), there doesn't seem to be
 * a way of getting the text of the clicked annotation
 */
function logLegendClick(event) {
  clearTimeout(currentClickCall)
  currentClickCall = setTimeout(() => log('click:scatterlegend:single'), 300)
}

/** log a double-click on a plotly graph legend */
function logLegendDoubleClick(event) {
  clearTimeout(currentClickCall)
  log('click:scatterlegend:double')
}
