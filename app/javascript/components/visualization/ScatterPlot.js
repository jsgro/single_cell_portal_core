import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'
import _uniqueId from 'lodash/uniqueId'

import { fetchCluster } from 'lib/scp-api'
import { get2DScatterProps, setMarkerColors } from 'lib/scatter-plot'
import { labelFont, getColorBrewerColor } from 'lib/plot'

/** Get Plotly layout object for scatter plot */
function basePlotlyLayout(clusterResponse) {
  let layout = {
    hovermode: 'closest',
    font: labelFont
  }

  return Object.assign(layout, get2DScatterProps(clusterResponse))
}

export default function ScatterPlot({studyAccession, viewOptions, exploreInfo}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  let [clusterData, setClusterData] = useState(null)
  const [graphElementId] = useState(_uniqueId('study-scatter-'))
  let hasLegend = true

  function handleResponse(clusterResponse) {
    if (clusterResponse.annotParams.type === 'group' && !clusterResponse.gene) {
      clusterResponse = setMarkerColors(clusterResponse)
    }
    const layout = basePlotlyLayout(clusterResponse)
    Plotly.newPlot(graphElementId, clusterResponse, layout, {responsive: true})
    setClusterData(clusterResponse)
  }

  useEffect(() => {
    const clusterResponse = fetchCluster(studyAccession,
                              viewOptions.cluster,
                              viewOptions.annotation ? viewOptions.annotation : '',
                              viewOptions.subsample,
                              viewOptions.consensus,
                              viewOptions.genes).then(handleResponse)


  }, [viewOptions.cluster, viewOptions.annotation.name, viewOptions.subsample])
  return (
    <div className="plot">
      <div
        className="scatter-graph"
        id={graphElementId}
        data-testid={graphElementId}
      >
      </div>
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
