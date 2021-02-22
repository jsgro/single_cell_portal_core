import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'

import { fetchCluster } from 'lib/scp-api'
import { labelFont, getColorBrewerColor } from 'lib/plot'
import { useUpdateLayoutEffect } from 'hooks/useUpdate'
import PlotTitle from './PlotTitle'

export const SCATTER_COLOR_OPTIONS = [
  'Greys', 'YlGnBu', 'Greens', 'YlOrRd', 'Bluered', 'RdBu', 'Reds', 'Blues', 'Picnic',
  'Rainbow', 'Portland', 'Jet', 'Hot', 'Blackbody', 'Earth', 'Electric', 'Viridis', 'Cividis'
]

export const defaultScatterColor = 'Reds'


/** Renders the appropriate scatter plot for the given study and dataParams
  * See ExploreView.js for the full specification of the dataParams object
  */
export default function ScatterPlot({
  studyAccession, dataParams, renderParams, dimensions,
  updateRenderParams, numColumns=1, numRows=1, isCellSelecting=false, plotPointsSelected
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [clusterData, setClusterData] = useState(null)
  const [graphElementId] = useState(_uniqueId('study-scatter-'))

  /** Process scatter plot data fetched from server */
  function handleResponse(clusterResponse) {


    // Get Plotly layout
    const layout = getPlotlyLayout(clusterResponse)
    const { width, height } = dimensions
    layout.width = width
    layout.height = height
    formatMarkerColors(clusterResponse.data, clusterResponse.annotParams.type, clusterResponse.gene)
    formatHoverLabels(clusterResponse.data, clusterResponse.annotParams.type, clusterResponse.gene)
    const dataScatterColor = processTraceScatterColor(clusterResponse.data, renderParams.scatterColor)
    window.Plotly.newPlot(graphElementId, clusterResponse.data, layout)
    $(`#${graphElementId}`).off('plotly_selected')
    $(`#${graphElementId}`).on('plotly_selected', plotPointsSelected)

    if (dataScatterColor !== renderParams.scatterColor) {
      updateRenderParams({ scatterColor: dataScatterColor })
    }
    setClusterData(clusterResponse)
    setIsLoading(false)
  }

  // Fetches plot data then draws it, upon load or change of any data parameter
  useEffect(() => {
    setIsLoading(true)
    fetchCluster(studyAccession,
      dataParams.cluster,
      dataParams.annotation ? dataParams.annotation : '',
      dataParams.subsample,
      dataParams.consensus,
      dataParams.genes).then(handleResponse)
  }, [dataParams.cluster,
    dataParams.annotation.name,
    dataParams.subsample,
    dataParams.consensus,
    dataParams.genes.join(',')])

  // Handles Plotly `data` updates, e.g. changes in color profile
  useUpdateLayoutEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (clusterData && !isLoading) {
      console.log('updating color scale')
      const dataUpdate = { 'marker.colorscale': renderParams.scatterColor }
      window.Plotly.update(graphElementId, dataUpdate)
    }
  }, [renderParams.scatterColor])

  // Handles cell select mode updates
  useUpdateLayoutEffect(() => {
    // Don't try to update the color if the graph hasn't loaded yet
    if (clusterData && !isLoading) {
      console.log('updating drag mode')
      const newDragMode = getDragMode(isCellSelecting)
      window.Plotly.relayout(graphElementId, { dragmode: newDragMode })
      if (!isCellSelecting) {
        window.Plotly.restyle(graphElementId, { selectedpoints: [null] })
      }
    }
  }, [isCellSelecting])

  // Adjusts width and height of plots upon toggle of "View Options"
  useUpdateLayoutEffect(() => {
    // Don't update if the graph hasn't loaded yet
    if (clusterData && !isLoading) {
      console.log('updating plotly dimensions')
      const { width, height } = dimensions
      const layoutUpdate = { width, height }
      window.Plotly.relayout(graphElementId, layoutUpdate)
    }
  }, [dimensions.width, dimensions.height])

  return (
    <div className="plot">
      { clusterData &&
        <PlotTitle
          cluster={clusterData.cluster}
          annotation={clusterData.annotParams.name}
          gene={clusterData.gene}/>
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

/** add trace marker colors to group annotations */
function formatMarkerColors(data, annotationType, gene) {
  if (annotationType === 'group' && !gene) {
    data.forEach((trace, i) => {
      trace.marker.color = getColorBrewerColor(i)
    })
  }
}

/** makes the data trace attributes (cells, trace name) available via hover text */
function formatHoverLabels(data, annotationType, gene) {
  const groupHoverTemplate = '(%{x}, %{y})<br><b>%{text}</b><br>%{data.name}<extra></extra>'
  data.forEach(trace => {
    if (annotationType === 'numeric' || gene) {
      trace.text = trace.annotations
      trace.hovertemplate = `(%{x}, %{y})<br>%{text}<br>${trace.marker.colorbar.title}: %{marker.color}<extra></extra>`
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

