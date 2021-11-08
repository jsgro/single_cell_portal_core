import React, { useState, useEffect } from 'react'
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
import { getPlotDimensions } from 'lib/plot'
import LoadingSpinner from 'lib/LoadingSpinner'

// sourced from https://github.com/plotly/plotly.js/blob/master/src/components/colorscale/scales.js
export const SCATTER_COLOR_OPTIONS = [
  'Greys', 'YlGnBu', 'Greens', 'YlOrRd', 'Bluered', 'RdBu', 'Reds', 'Blues', 'Picnic',
  'Rainbow', 'Portland', 'Jet', 'Hot', 'Blackbody', 'Earth', 'Electric', 'Viridis', 'Cividis'
]

export const defaultScatterColor = 'Reds'
window.Plotly = Plotly

/** Get width and height for scatter plot dimensions */
export function getScatterWidthHeight(scatter, dimensionProps) {
  const isRefGroup = getIsRefGroup(scatter)

  dimensionProps = Object.assign({
    hasLabelLegend: isRefGroup,
    hasTitle: true
  }, dimensionProps)

  return getPlotDimensions(dimensionProps)
}


/** Renders the appropriate scatter plot for the given study and params
  * @param studyAccession {string} e.g. 'SCP213'
  * @param cluster {string} the name of the cluster, or blank/null for the study's default
  * @param annotation {obj} an object with name, type, and scope attributes
  * @param subsample {string} a string for the subsample to be retrieved.
  * @param consensus {string} for multi-gene expression plots
  * @param dimensionsProps {obj} object with props to determine height and
  *   width, to instruct Plotly how large to render itself. this is useful for
  *   rendering to hidden divs
  * @param isCellSelecting whether plotly's lasso selection tool is enabled
  * @plotPointsSelected {function} callback for when a user selects points on the plot, which corresponds
  *   to the plotly "points_selected" event
  */
function RawScatterPlot({
  studyAccession, cluster, annotation, subsample, consensus, genes, scatterColor, dimensionProps,
  isAnnotatedScatter=false, isCorrelatedScatter=false, isCellSelecting=false, plotPointsSelected, dataCache
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [bulkCorrelation, setBulkCorrelation] = useState(null)
  const [labelCorrelations, setLabelCorrelations] = useState(null)
  const [scatterData, setScatterData] = useState(null)
  // hash of trace label names to the number of points in that trace
  const [countsByLabel, setCountsByLabel] = useState(null)
  const [shownTraces, setShownTraces] = useState([])

  // Whether the "Show all" and "Hide all" links are active
  const [showHideActive, setShowHideActive] = useState([false, true])
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()

  /** Update status of "Show all" and "Hide all" links */
  function updateShowHideActive(numShownTraces, numLabels, value, applyToAll) {
    let active
    if (applyToAll) {
      active = (value ? [true, false] : [false, true])
    } else {
      // Update "Show all" and "Hide all" links to reflect current shownTraces
      if (numShownTraces > 0 && numShownTraces < numLabels) {
        active = [true, true]
      } else if (numShownTraces === 0) {
        active = [false, true]
      } else if (numShownTraces === numLabels) {
        active = [true, false]
      }
    }
    setShowHideActive(active)
  }

  /**
   * Handle user interaction with one or more labels in legend.
   *
   * Clicking a label in the legend shows or hides the corresponding set of
   * labeled cells (i.e., the corresponding Plotly.js trace) in the scatter
   * plot.
   */
  function updateShownTraces(labels, value, numLabels, applyToAll=false) {
    let newShownTraces
    if (applyToAll) {
      // Handle multi-filter interaction
      newShownTraces = (value ? labels : [])
    } else {
      // Handle single-filter interaction
      const label = labels
      newShownTraces = [...shownTraces]

      if (value && !newShownTraces.includes(label)) {
        newShownTraces.push(label)
      }
      if (!value) {
        _remove(newShownTraces, thisLabel => {return thisLabel === label})
      }
    }

    updateShowHideActive(newShownTraces.length, numLabels, value, applyToAll)

    setShownTraces(newShownTraces)
  }

  /** Process scatter plot data fetched from server */
  function processScatterPlot(clusterResponse=null) {
    let [scatter, perfTimes] =
      (clusterResponse ? clusterResponse : [scatterData, null])

    const widthHeight = getScatterWidthHeight(scatter, dimensionProps)
    scatter = Object.assign(scatter, widthHeight)

    const layout = getPlotlyLayout(scatter)

    const traceArgs = {
      axes: scatter.axes,
      data: scatter.data,
      annotName: scatter.annotParams.name,
      annotType: scatter.annotParams.type,
      genes: scatter.genes,
      isAnnotatedScatter: scatter.isAnnotatedScatter,
      isCorrelatedScatter,
      scatterColor,
      dataScatterColor: scatter.scatterColor,
      pointAlpha: scatter.pointAlpha,
      pointSize: scatter.pointSize,
      showPointBorders: scatter.showClusterPointBorders,
      is3D: scatter.is3D,
      labelCorrelations,
      shownTraces,
      scatter
    }
    const [traces, labelCounts] = getPlotlyTraces(traceArgs)
    const plotlyTraces = [traces]
    setCountsByLabel(labelCounts)

    const startTime = performance.now()
    Plotly.react(graphElementId, plotlyTraces, layout)

    if (perfTimes) {
      perfTimes.plot = performance.now() - startTime
      logScatterPlot({ scatter, genes }, perfTimes)
    }

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
        if (perfTimes) {
          log('plot:correlations', { perfTime: rhoTime })
        }
      })
    }

    if (clusterResponse) {
      setScatterData(scatter)
      setShowError(false)
      setIsLoading(false)
    }
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
    }).then(processScatterPlot).catch(error => {
      Plotly.purge(graphElementId)
      setErrorContent(error.message)
      setShowError(true)
      setIsLoading(false)
    })
  }, [cluster, annotation.name, subsample, consensus, genes.join(','), isAnnotatedScatter])

  // Handles custom scatter legend updates
  useUpdateEffect(() => {
    // Don't update if graph hasn't loaded
    if (scatterData && !isLoading) {
      processScatterPlot()
    }
  }, [shownTraces, dimensionProps])

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

  // TODO (SCP-3712): Update legend click (as backwards-compatibly as possible)
  // as part of productionizing custom legend code.
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
        { scatterData && countsByLabel &&
        <ScatterPlotLegend
          name={scatterData.annotParams.name}
          height={scatterData.height}
          countsByLabel={countsByLabel}
          correlations={labelCorrelations}
          shownTraces={shownTraces}
          updateShownTraces={updateShownTraces}
          showHideActive={showHideActive}
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
        <LoadingSpinner data-testid={`${graphElementId}-loading-icon`}/>
      }
    </div>
  )
}

const ScatterPlot = withErrorBoundary(RawScatterPlot)
export default ScatterPlot

/**
 * Whether scatter plot should use custom legend
 *
 * Such legends are used for reference group plots, which are:
 *   A) commonly shown in the default view, and
 *   B) also shown at right in single-gene view
 */
function getIsRefGroup(scatter) {
  const annotType = scatter.annotParams.type
  const genes = scatter.genes
  const isCorrelatedScatter = scatter.isCorrelatedScatter
  const isGeneExpressionForColor = genes.length && !isCorrelatedScatter

  return annotType === 'group' && !isGeneExpressionForColor
}

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
  is3D,
  shownTraces,
  scatter
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

  const isRefGroup = getIsRefGroup(scatter)

  if (isRefGroup) {
    // Use Plotly's groupby and filter transformation to make the traces
    // note these transforms are deprecated in the latest Plotly versions
    const [legendStyles, labelCounts] = getStyles(data, pointSize)
    countsByLabel = labelCounts
    trace.transforms = [
      {
        type: 'groupby',
        groups: data.annotations,
        styles: legendStyles
      }
    ]

    if (shownTraces.length > 0) {
      trace.transforms.push({
        type: 'filter',
        target: data.annotations,
        // For available operations, see:
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/transforms/filter.js
        // - https://github.com/plotly/plotly.js/blob/v2.5.1/src/constants/filter_ops.js
        // Plotly docs are rather sparse here.
        operation: '}{',
        value: shownTraces
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
function getPlotlyLayout({
  width,
  height,
  axes,
  userSpecifiedRanges,
  hasCoordinateLabels,
  coordinateLabels,
  isAnnotatedScatter,
  isCorrelatedScatter,
  is3D,
  isCellSelecting=false
}) {
  const layout = {
    hovermode: 'closest',
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
