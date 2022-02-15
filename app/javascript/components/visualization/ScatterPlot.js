import React, { useState, useEffect } from 'react'
import _uniqueId from 'lodash/uniqueId'
import _remove from 'lodash/remove'
import Plotly from 'plotly.js-dist'
import { store } from 'react-notifications-component'

import { fetchCluster, updateStudyFile } from 'lib/scp-api'
import { logScatterPlot } from 'lib/scp-api-metrics'
import { log } from 'lib/metrics-api'
import { useUpdateEffect } from 'hooks/useUpdate'
import PlotTitle from './PlotTitle'
import ScatterPlotLegend from './controls/ScatterPlotLegend'
import useErrorMessage from 'lib/error-message'
import { computeCorrelations } from 'lib/stats'
import { withErrorBoundary, readableErrorMessage } from 'lib/ErrorBoundary'
import { getFeatureFlagsWithDefaults } from 'providers/UserProvider'
import { getPlotDimensions, filterTrace, getStyle, getSortedLabels, getColorForLabel } from 'lib/plot'
import LoadingSpinner from 'lib/LoadingSpinner'
import { formatFileForApi } from 'components/upload/upload-utils'
import { successNotification, failureNotification } from 'lib/MessageModal'

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
  * @param dimensionsProps {obj} object with props to determine height and
  *   width, to instruct Plotly how large to render itself. this is useful for
  *   rendering to hidden divs
  * @param isCellSelecting whether plotly's lasso selection tool is enabled
  * @param plotPointsSelected {function} callback for when a user selects points on the plot, which corresponds
  *   to the plotly "points_selected" event
  * @param canEdit {Boolean} whether the current user has permissions to edit this study
  */
function RawScatterPlot({
  studyAccession, cluster, annotation, subsample, consensus, genes, scatterColor, dimensionProps,
  isAnnotatedScatter=false, isCorrelatedScatter=false, isCellSelecting=false, plotPointsSelected, dataCache,
  canEdit
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [bulkCorrelation, setBulkCorrelation] = useState(null)
  const [labelCorrelations, setLabelCorrelations] = useState(null)
  const [scatterData, setScatterData] = useState(null)
  // hash of trace label names to the number of points in that trace
  const [countsByLabel, setCountsByLabel] = useState(null)
  // array of trace names (strings) to show in the graph
  const [hiddenTraces, setHiddenTraces] = useState([])
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()
  const [activeTraceLabel, setActiveTraceLabel] = useState(null)
  // map of label name to color hex codes, for any labels the user has picked a color for
  const [editedCustomColors, setEditedCustomColors] = useState({})

  /**
   * Handle user interaction with one or more labels in legend.
   *
   * Clicking a label in the legend shows or hides the corresponding set of
   * labeled cells (i.e., the corresponding Plotly.js trace) in the scatter
   * plot.
   */
  function updateHiddenTraces(labels, value, applyToAll=false) {
    let newShownTraces
    if (applyToAll) {
      // Handle multi-filter interaction
      newShownTraces = (value ? labels : [])
    } else {
      // Handle single-filter interaction
      const label = labels
      newShownTraces = [...hiddenTraces]

      if (value && !newShownTraces.includes(label)) {
        newShownTraces.push(label)
      }
      if (!value) {
        _remove(newShownTraces, thisLabel => {return thisLabel === label})
      }
    }

    setHiddenTraces(newShownTraces)
  }

  /** Get new, updated scatter object instance, and new layout */
  function updateScatterLayout(scatter=null) {
    if (!scatter) {
      // New instance forces render of legend (without recomputing traces)
      scatter = Object.assign({}, scatterData)
    }
    const widthAndHeight = getScatterDimensions(scatter, dimensionProps)
    scatter = Object.assign(scatter, widthAndHeight)
    scatter.layout = getPlotlyLayout(scatter)

    return scatter
  }

  /** Save any changes to the legend colors */
  async function saveCustomColors(newColors) {
    const colorObj = {}
    // read the annotation name off of scatterData to ensure it's the real name, and not '' or '_default'
    colorObj[scatterData.annotParams.name] = newColors
    const newFileObj = {
      _id: scatterData.clusterFileId,
      custom_color_updates: colorObj
    }
    setIsLoading(true)
    try {
      const response = await updateStudyFile({
        studyAccession,
        studyFileId: scatterData.clusterFileId,
        studyFileData: formatFileForApi(newFileObj)
      })
      store.addNotification(successNotification(`Colors saved successfully`))
      const newScatterData = Object.assign({}, scatterData, {
        customColors: response.cluster_file_info?.custom_colors[scatterData.annotParams.name] ?? {}
      })
      setEditedCustomColors({})
      setIsLoading(false)
      setScatterData(newScatterData)
    } catch (error) {
      store.addNotification(failureNotification(<span>Error saving colors<br/>{error}</span>))
      setIsLoading(false)
    }
  }

  /** Update layout, without recomputing traces */
  function resizePlot() {
    const scatter = updateScatterLayout()
    Plotly.relayout(graphElementId, scatter.layout)
    setScatterData(scatter)
  }

  /** Update legend counts and recompute traces, without recomputing layout */
  function updateCountsAndGetTraces(scatter) {
    const [traces, labelCounts] = getPlotlyTraces({
      genes,
      isAnnotatedScatter,
      isCorrelatedScatter,
      scatterColor,
      editedCustomColors,
      hiddenTraces,
      scatter,
      activeTraceLabel
    })
    setCountsByLabel(labelCounts)
    return traces
  }

  /** Process scatter plot data fetched from server */
  function processScatterPlot(clusterResponse=null) {
    let [scatter, perfTimes] =
      (clusterResponse ? clusterResponse : [scatterData, null])

    scatter = updateScatterLayout(scatter)
    const layout = scatter.layout

    const plotlyTraces = updateCountsAndGetTraces(scatter)

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
    }).then(processScatterPlot)
  }, [cluster, annotation.name, subsample, consensus, genes.join(','), isAnnotatedScatter])

  // Handles custom scatter legend updates
  const customColors = scatterData?.customColors ?? {}
  useUpdateEffect(() => {
    // Don't update if graph hasn't loaded
    if (scatterData && !isLoading) {
      const plotlyTraces = updateCountsAndGetTraces(scatterData)
      Plotly.react(graphElementId, plotlyTraces, scatterData.layout)
    }
    // look for updates of individual properties, so that we don't rerender if the containing array
    // happens to be a different instance
  }, [hiddenTraces.join(','), Object.values(editedCustomColors).join(','), Object.values(customColors).join(',')])

  // Handles window resizing
  const widthAndHeight = getScatterDimensions(scatterData, dimensionProps, genes)
  useUpdateEffect(() => {
    // Don't update if graph hasn't loaded
    if (scatterData && !isLoading) {
      resizePlot()
    }
    // look for updates of individual properties, so that we don't rerender if the containing array
    // happens to be a different instance
  }, [widthAndHeight.height, widthAndHeight.width])

  // Handles Plotly `data` updates, e.g. changes in color profile
  useUpdateEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (scatterData && !isLoading) {
      const dataUpdate = { 'marker.colorscale': scatterColor, 'marker.reversescale': shouldReverseScale(scatterColor) }
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
    return () => {
      jqScatterGraph.off('plotly_selected')
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
            hiddenTraces={hiddenTraces}
            updateHiddenTraces={updateHiddenTraces}
            editedCustomColors={editedCustomColors}
            setEditedCustomColors={setEditedCustomColors}
            customColors={customColors}
            enableColorPicking={canEdit}
            saveCustomColors={saveCustomColors}
            activeTraceLabel={activeTraceLabel}
            setActiveTraceLabel={setActiveTraceLabel}
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
function getIsRefGroup(annotType, genes, isCorrelatedScatter) {
  const isGeneExpressionForColor = genes.length && !isCorrelatedScatter

  return annotType === 'group' && !isGeneExpressionForColor
}

/** Get width and height for scatter plot dimensions */
function getScatterDimensions(scatter, dimensionProps, genes) {
  // if we don't have a server response yet so we don't know the annotation type,
  // guess based on the number of genes
  let isRefGroup
  if (scatter) {
    isRefGroup = getIsRefGroup(
      scatter.annotParams.type, scatter.genes, scatter.isCorrelatedScatter
    )
  } else {
    isRefGroup = genes.length === 0
  }

  dimensionProps = Object.assign({
    hasLabelLegend: isRefGroup,
    hasTitle: true
  }, dimensionProps)

  return getPlotDimensions(dimensionProps)
}


/** Reverse the continuous colorscale so high contrast color corresponds to high expression */
function shouldReverseScale(scatterColor) {
  // don't reverse the Reds scale, and check whether it is the default
  const shownColor = scatterColor ? scatterColor : defaultScatterColor
  return shownColor !== 'Reds'
}

/** get the array of plotly traces for plotting */
export function getPlotlyTraces({
  genes,
  isAnnotatedScatter,
  isCorrelatedScatter,
  scatterColor,
  editedCustomColors,
  hiddenTraces,
  scatter: {
    axes, data, pointAlpha, pointSize, is3D,
    scatterColor: dataScatterColor,
    annotParams: { name: annotName, type: annotType },
    customColors = {}
  },
  activeTraceLabel
}) {
  const unfilteredTrace = {
    type: is3D ? 'scatter3d' : 'scattergl',
    mode: 'markers',
    x: data.x,
    y: data.y,
    annotations: data.annotations,
    cells: data.cells,
    opacity: pointAlpha ? pointAlpha : 1
  }
  if (is3D) {
    unfilteredTrace.z = data.z
  }


  const isRefGroup = getIsRefGroup(annotType, genes, isCorrelatedScatter)
  const [traces, countsByLabel] = filterTrace(unfilteredTrace, hiddenTraces, null, isRefGroup, activeTraceLabel)

  if (isRefGroup) {
    const labels = getSortedLabels(countsByLabel)
    traces.forEach(groupTrace => {
      groupTrace.type = unfilteredTrace.type
      groupTrace.mode = unfilteredTrace.mode
      groupTrace.opacity = unfilteredTrace.opacity
      const color = getColorForLabel(groupTrace.name, customColors, editedCustomColors, labels.indexOf(groupTrace.name))
      groupTrace.marker = {
        size: pointSize,
        color
      }
    })
    // Use Plotly's groupby and filter transformation to make the traces
    // note these transforms are deprecated in the latest Plotly versions
    /*  const [legendStyles] = getStyles(traces, pointSize, customColors, editedCustomColors)
    trace.transforms = [
      {
        type: 'groupby',
        groups: data.annotations,
        styles: legendStyles
      }
    ] */
  } else {
    const trace = traces[0]
    const isGeneExpressionForColor = genes.length && !isCorrelatedScatter && !isAnnotatedScatter
    // for non-clustered plots, we pass in a single trace with all the points
    let colors
    if (isGeneExpressionForColor) {
      // sort the points by order of expression
      const expressionsWithIndices = new Array(data.expression.length)
      for (let i = 0; i < data.expression.length; i++) {
        expressionsWithIndices[i] = [data.expression[i], i]
      }
      expressionsWithIndices.sort((a, b) => a[0] - b[0])

      // initialize the other arrays (see )
      trace.x = new Array(data.expression.length)
      trace.y = new Array(data.expression.length)
      if (is3D) {
        trace.z = new Array(data.expression.length)
      }
      trace.annotations = new Array(data.expression.length)
      trace.cells = new Array(data.expression.length)

      colors = new Array(data.expression.length)

      // now that we know the indices, reorder the other data arrays
      for (let i = 0; i < expressionsWithIndices.length; i++) {
        const sortedIndex = expressionsWithIndices[i][1]
        trace.x[i] = data.x[sortedIndex]
        trace.y[i] = data.y[sortedIndex]
        if (is3D) {
          trace.z[i] = data.z[sortedIndex]
        }
        trace.cells[i] = data.cells[sortedIndex]
        trace.annotations[i] = data.annotations[sortedIndex]
        colors[i] = expressionsWithIndices[i][0]
      }
    } else {
      colors = isGeneExpressionForColor ? data.expression : data.annotations
    }

    trace.marker = {
      line: { color: 'rgb(40,40,40)', width: 0 },
      size: pointSize
    }

    if (!isAnnotatedScatter) {
      const appliedScatterColor = getScatterColorToApply(dataScatterColor, scatterColor)
      const title = isGeneExpressionForColor ? axes.titles.magnitude : annotName

      Object.assign(trace.marker, {
        showscale: true,
        colorscale: appliedScatterColor,
        reversescale: shouldReverseScale(appliedScatterColor),
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
  // addHoverLabel(traces, annotName, annotType, genes, isAnnotatedScatter, isCorrelatedScatter, axes)

  return [traces, countsByLabel]
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
