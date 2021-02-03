import React from 'react'
import ScatterPlot from 'components/visualization/ScatterPlot'
/* handles a group of scatter plots, inlcuding clusters, gene expression, and/or spatial */
export default function ScatterPlotGroup({studyAccession, viewOptions, exploreInfo}) {
  let plotContainerClass = 'col-md-12'
  if (viewOptions.spatialClusters && viewOptions.spatialClusters.length) {
    plotContainerClass = 'col-md-6'
  }
  return (
    <div className="row">
      Here's the ScatterPlotGroup
      <div className={plotContainerClass}>
        <ScatterPlot studyAccession={studyAccession} viewOptions={viewOptions}  exploreInfo={exploreInfo}/>
      </div>
    </div>
  )
}
