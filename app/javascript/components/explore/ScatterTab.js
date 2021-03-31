import React from 'react'

import ScatterPlot from 'components/visualization/ScatterPlot'

/**
  * renders the scatter tab.  Handles 6 permutations: (spatial / noSpatial) X (no / single / multigene)
  */
export default function ScatterTab({
  exploreInfo, exploreParams, updateExploreParams, studyAccession, isGene, isMultiGene,
  plotPointsSelected, isCellSelecting, getPlotDimensions
}) {
  const scatterParams = []
  let isTwoColumn = true
  let isMultiRow = false
  let firstRowSingleCol = false
  const isSpatial = exploreParams.spatialGroups?.length > 0

  if (isMultiGene && !exploreParams.consensus) {
    if (isSpatial) {
      // for multi-gene spatial, show the reference spatial cluster at the top, then
      // show the expression in the spatial files
      firstRowSingleCol = true
      isMultiRow = true
      // first plot is reference cluster, so no genes
      scatterParams.push({ ...exploreParams, cluster: exploreParams.spatialGroups[0], genes: [] })
      exploreParams.genes.forEach(gene => {
        scatterParams.push({ ...exploreParams, genes: [gene] })
      })
    } else {
      // for non-spatial multigene, show each gene, with the cluster as the second plot
      isMultiRow = true
      exploreParams.genes.forEach((gene, index) => {
        scatterParams.push({ ...exploreParams, genes:  [exploreParams.genes[index]] })
        if (index === 0) {
          scatterParams.push({ ...exploreParams, genes: [] })
        }
      })
    }
  } else if (isGene) {
    if (isSpatial) {
      // for single-gene spatial, show the gene expression and reference cluster, then the expresion
      // overlaid over the spatial plot, then the spatial-cluster plot
      scatterParams.push({ ...exploreParams })
      scatterParams.push({ ...exploreParams, genes: [] })
      // show a row for each spatial group selected
      exploreParams.spatialGroups.slice(0, 3).forEach(spatialGroup => {
        scatterParams.push({ ...exploreParams, cluster: spatialGroup})
        scatterParams.push({ ...exploreParams, cluster: spatialGroup, genes: []})
      })
    } else {
      // for single-gene non-spatial, show the expression plot and the cluster plot
      scatterParams.push({ ...exploreParams })
      scatterParams.push({ ...exploreParams, genes: [] })
    }
  } else {
    // no gene search, just showing clusters
    if (isSpatial) {
      // for spatial non-gene, show the cluster, and then a plot for each spatial cluster
      scatterParams.push({ ...exploreParams })
      exploreParams.spatialGroups.forEach(spatialGroup => {
        scatterParams.push({ ...exploreParams, cluster: spatialGroup })
      })
    } else {
      isTwoColumn = false
      // for non-spatial non-gene, just show the cluster
      scatterParams.push({ ...exploreParams })
    }
  }

  /** helper function for Scatter plot color updates */
  function updateScatterColor(color) {
    updateExploreParams({ scatterColor: color }, false)
  }

  return <div className="row">
    { scatterParams.map((params, index) => {
      const isTwoColRow = isTwoColumn && !(index === 0 && firstRowSingleCol)
      return <div className={isTwoColRow ? 'col-md-6' : 'col-md-12'}
        key={params.cluster + params.genes.join('-')}
        >
        <ScatterPlot
          {...{
            studyAccession, plotPointsSelected, isCellSelecting, updateScatterColor
          }}
          {...params}
          dimensions={getPlotDimensions({
            isMultiRow,
            isTwoColumn: isTwoColRow,
            hasTitle: true
          })}
        />
      </div>
    })}
  </div>
}
