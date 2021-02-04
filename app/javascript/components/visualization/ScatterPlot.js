import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'

import { fetchCluster } from 'lib/scp-api'
import { setMarkerColors } from 'lib/scatter-plot'
import { labelFont, getColorBrewerColor } from 'lib/plot'



export default function ScatterPlot({studyAccession, viewOptions, exploreInfo}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  let [clusterData, setClusterData] = useState(null)
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  let hasLegend = true

  function handleResponse(clusterResponse) {
    try {
      if (clusterResponse.annotParams.type === 'group' && !clusterResponse.gene) {
        clusterResponse.data = setMarkerColors(clusterResponse.data)
      }
      const layout = getPlotlyLayout(clusterResponse)
      Plotly.newPlot(graphElementId, clusterResponse.data, layout, { responsive: true })
    } catch (error) {
      alert("An unexpected error occurred rendering the graph: " + error)
    }

    setClusterData(clusterResponse)
    setIsLoading(false)
  }

  useEffect(() => {
    // don't update if the param changes are just defaults coming back from the server,
    // we will have already fetched the default view
    if (viewOptions.isUserUpdated !== false) {
      setIsLoading(true)
      const clusterResponse = fetchCluster(studyAccession,
                                viewOptions.cluster,
                                viewOptions.annotation ? viewOptions.annotation : '',
                                viewOptions.subsample,
                                viewOptions.consensus,
                                viewOptions.genes).then(handleResponse)
    }
  }, [viewOptions.cluster, viewOptions.annotation.name, viewOptions.subsample])
  return (
    <div className="plot">
      <div
        className="scatter-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
      </div>
      { clusterData && clusterData.description &&
        <p className="help-block text-center">{ clusterData.description }</p>
      }

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

/** Get Plotly layout object for scatter plot */
function getPlotlyLayout(clusterResponse) {
  let layout = {
    hovermode: 'closest',
    font: labelFont
  }
  if (clusterResponse.is3d) {
    layout.scene = get3DScatterProps(clusterResponse)
  } else {
    Object.assign(layout, get2DScatterProps(clusterResponse))
  }

  return layout
}

function get2DScatterProps(cluster) {
  const {
    axes, domainRanges, hasCoordinateLabels, coordinateLabels
  } = cluster
  const { titles } = axes

  const layout = {
    xaxis: { title: titles.x },
    yaxis: { title: titles.y }
  }

  if (cluster.isAnnotatedScatter === false) {
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
export function get3DScatterProps(cluster) {
  const { domainRanges, axes } = cluster
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

