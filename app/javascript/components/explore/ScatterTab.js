import React from 'react'

/**
  * renders the scatter tab.  Handles 6 permutations: (spatial / noSpatial) x (no / single / multigene)
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
      scatterParams.push({ ...exploreParams, cluster: exploreParams.spatialGroups[0]})
      scatterParams.push({ ...exploreParams, cluster: exploreParams.spatialGroups[0], genes: []})
    } else {
      scatterParams.push({ ...exploreParams })
      scatterParams.push({ ...exploreParams, genes: [] })
    }
  } else {
    // just showing clusters
    if (isSpatial) {
      scatterParams.push({ ...exploreParams })
      exploreParams.spatialGroups.forEach(spatialGroup => {
        scatterParams.push({ ...exploreParams, cluster: spatialGroup })
      })
    } else {
      isTwoColumn = false
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
