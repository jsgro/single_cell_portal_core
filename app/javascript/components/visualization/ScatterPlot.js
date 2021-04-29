import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'
import Plotly from 'plotly.js-dist'

import { fetchCluster } from 'lib/scp-api'
import { logScatterPlot } from 'lib/scp-api-metrics'
import { labelFont, getColorBrewerColor } from 'lib/plot'
import { useUpdateEffect } from 'hooks/useUpdate'
import PlotTitle from './PlotTitle'
import useErrorMessage, { checkScpApiResponse } from 'lib/error-message'
import { withErrorBoundary } from 'lib/ErrorBoundary'

// sourced from https://github.com/plotly/plotly.js/blob/master/src/components/colorscale/scales.js
export const SCATTER_COLOR_OPTIONS = [
  'Greys', 'YlGnBu', 'Greens', 'YlOrRd', 'Bluered', 'RdBu', 'Reds', 'Blues', 'Picnic',
  'Rainbow', 'Portland', 'Jet', 'Hot', 'Blackbody', 'Earth', 'Electric', 'Viridis', 'Cividis'
]

export const defaultScatterColor = 'Reds'


/** Renders the appropriate scatter plot for the given study and params
  * @param studyAccession {string} e.g. 'SCP213'
  * @param cluster {string} the name of the cluster, or blank/null for the study's default
  * @param annotation {obj} an object with name, type, and scope attributes
  * @param subsample {string} a string for the subsampel to be retrieved.
  * @param consensus {string} for multi-gene expression plots
  * @param dimensions {obj} object with height and width, to instruct plotly how large to render itself
  *   this is useful for rendering to hidden divs
  * @param isCellSelecting whether plotly's lasso selection tool is enabled
  * @plotPointsSelected {function} callback for when a user selects points on the plot, which corresponds
  *   to the plotly "points_selected" event
  */
function RawScatterPlot({
  studyAccession, cluster, annotation, subsample, consensus, genes, scatterColor, dimensions,
  isAnnotatedScatter=false, isCellSelecting=false, plotPointsSelected
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [clusterData, setClusterData] = useState(null)
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  const { ErrorComponent, setShowError, setErrorContent } = useErrorMessage()
  /** Process scatter plot data fetched from server */
  function handleResponse(clusterResponse) {
    const [scatter, perfTime] = clusterResponse

    const apiOk = checkScpApiResponse(scatter,
      () => Plotly.purge(graphElementId),
      setShowError,
      setErrorContent)

    if (apiOk) {
      // Get Plotly layout
      const layout = getPlotlyLayout(scatter)
      const { width, height } = dimensions
      layout.width = width
      layout.height = height
      formatMarkerColors(scatter.data, scatter.annotParams.type, scatter.gene)
      formatHoverLabels(scatter.data, scatter.annotParams.type, scatter.gene, isAnnotatedScatter)
      processTraceScatterColor(scatter.data, scatterColor)

      const perfTimeFrontendStart = performance.now()

      Plotly.react(graphElementId, scatter.data, layout)

      logScatterPlot(
        { scatter, genes, width, height },
        { perfTime, perfTimeFrontendStart }
      )

      setClusterData(scatter)
      setShowError(false)
    }
    setIsLoading(false)
  }

  // Fetches plot data then draws it, upon load or change of any data parameter
  useEffect(() => {
    setIsLoading(true)
    fetchCluster(studyAccession,
      cluster,
      annotation ? annotation : '',
      subsample,
      consensus,
      genes,
      isAnnotatedScatter).then(handleResponse)
  }, [cluster, annotation.name, subsample, consensus, genes.join(','), isAnnotatedScatter])

  // Handles Plotly `data` updates, e.g. changes in color profile
  useUpdateEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (clusterData && !isLoading) {
      const dataUpdate = { 'marker.colorscale': scatterColor }
      Plotly.update(graphElementId, dataUpdate)
    }
  }, [scatterColor])

  // Handles cell select mode updates
  useUpdateEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (clusterData && !isLoading) {
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
    if (clusterData && !isLoading) {
      const { width, height } = dimensions
      const layoutUpdate = { width, height }
      Plotly.relayout(graphElementId, layoutUpdate)
    }
  }, [dimensions.width, dimensions.height])


  useEffect(() => {
    $(`#${graphElementId}`).on('plotly_selected', plotPointsSelected)
    $(`#${graphElementId}`).on('plotly_legendclick', logLegendClick)
    $(`#${graphElementId}`).on('plotly_legenddoubleclick', logLegendDoubleClick)
    return () => {
      $(`#${graphElementId}`).off('plotly_selected')
      $(`#${graphElementId}`).off('plotly_legendclick')
      $(`#${graphElementId}`).off('plotly_legenddoubleclick')
      Plotly.purge(graphElementId)
    }
  }, [])

  return (
    <div className="plot">
      { ErrorComponent }
      { clusterData &&
        <PlotTitle
          cluster={clusterData.cluster}
          annotation={clusterData.annotParams.name}
          subsample={clusterData.subsample}
          gene={clusterData.gene}
          consensus={clusterData.consensus}/>
      }
      <div
        className="scatter-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
      </div>
      <p className="help-block">
        { clusterData && clusterData.description &&
          <span>{clusterData.description}</span>
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


/** add trace marker colors to group annotations */
function formatMarkerColors(data, annotationType, gene) {
  if (annotationType === 'group' && !gene) {
    data.forEach((trace, i) => {
      trace.marker.color = getColorBrewerColor(i)
    })
  }
}

/** makes the data trace attributes (cells, trace name) available via hover text */
function formatHoverLabels(data, annotationType, gene, isAnnotatedScatter) {
  const groupHoverTemplate = '(%{x}, %{y})<br><b>%{text}</b><br>%{data.name}<extra></extra>'
  data.forEach(trace => {
    trace.text = trace.cells
    if (!isAnnotatedScatter && (annotationType === 'numeric' || gene)) {
      // use the 'meta' property so annotations are exposed to the hover template
      // see https://community.plotly.com/t/hovertemplate-does-not-show-name-property/36139
      trace.meta = trace.annotations
      trace.hovertemplate = `(%{x}, %{y})<br>%{text} (%{meta})<br>
        ${trace.marker.colorbar.title}: %{marker.color}<extra></extra>`
    } else {
      trace.text = trace.cells
      trace.hovertemplate = groupHoverTemplate
    }
  })
}

/** sets the scatter color on the given races.  If no color is sspecified, it reads the color from the data */
function processTraceScatterColor(data, scatterColor) {
  // Set color scale
  if (!scatterColor) {
    scatterColor = data[0].marker.colorscale
  }
  if (!scatterColor) {
    scatterColor = defaultScatterColor
  }
  if (data[0].marker) {
    data[0].marker.colorscale = scatterColor
  }
  return scatterColor
}

/** Gets Plotly layout object for scatter plot */
function getPlotlyLayout({
  axes,
  domainRanges,
  hasCoordinateLabels,
  coordinateLabels,
  isAnnotatedScatter,
  is3d,
  isCellSelecting=false,
  gene,
  annotParams
}) {
  const layout = {
    hovermode: 'closest',
    font: labelFont,
    dragmode: getDragMode(isCellSelecting)
  }
  if (is3d) {
    layout.scene = get3DScatterProps({ domainRanges, axes })
  } else {
    const props2d = get2DScatterProps({
      axes,
      domainRanges,
      hasCoordinateLabels,
      coordinateLabels,
      isAnnotatedScatter
    })
    Object.assign(layout, props2d)
  }
  if (!gene.length && annotParams && annotParams.name) {
    layout.legend = { title: { text: annotParams.name } }
  }
  return layout
}

/** Gets Plotly layout object for two-dimensional scatter plot */
function get2DScatterProps({
  axes,
  domainRanges,
  hasCoordinateLabels,
  coordinateLabels,
  isAnnotatedScatter
}) {
  const { titles } = axes

  const layout = {
    xaxis: { title: titles.x },
    yaxis: { title: titles.y }
  }

  if (isAnnotatedScatter === false) {
    layout.xaxis.showticklabels = false
    layout.yaxis.scaleanchor = 'x'
    layout.yaxis.showticklabels = false
    layout.margin = {
      t: 25,
      r: 0,
      b: 20,
      l: 0
    }
  }

  // if user has supplied a range, set that, otherwise let Plotly autorange
  if (domainRanges) {
    layout.xaxis.range = domainRanges.x
    layout.yaxis.range = domainRanges.y
  } else {
    layout.xaxis.autorange = true
    layout.yaxis.autorange = true
  }

  if (hasCoordinateLabels) {
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
export function get3DScatterProps({ domainRanges, axes }) {
  const { titles, ranges, aspects } = axes

  const scene = {
    baseCamera,
    aspectmode: 'cube',
    xaxis: { title: titles.x, autorange: true, showticklabels: false },
    yaxis: { title: titles.y, autorange: true, showticklabels: false },
    zaxis: { title: titles.z, autorange: true, showticklabels: false }
  }

  if (domainRanges) {
    scene.xaxis.autorange = false
    scene.xaxis.range = ranges.x
    scene.yaxis.autorange = false
    scene.yaxis.range = ranges.y
    scene.zaxis.autorange = false
    scene.zaxis.range = ranges.x
    scene.aspectmode = aspects.mode,
    scene.aspectratio = {
      x: aspects.x,
      y: aspects.y,
      z: aspects.z
    }
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
