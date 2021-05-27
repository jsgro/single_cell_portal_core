import React from 'react'

/** Renders a plot title for scatter plots */
export default function PlotTitle({
  cluster, annotation, genes, consensus, subsample, isCorrelatedScatter, pearsonsR
}) {
  let contentString = cluster
  let detailString = ''
  if (genes.length) {
    const geneString = genes.join(', ')
    detailString = cluster
    if (consensus) {
      contentString = `${geneString} - ${consensus} expression`
    } else {
      contentString = `${geneString} - expression`
    }
  }
  if (subsample && subsample !== 'all') {
    detailString += ` subsample[${subsample}]`
  }
  return <h5 className="plot-title">
    <span className="cluster-title">{contentString} </span>
    <span className="detail"> {detailString}</span>
    { isCorrelatedScatter &&
      <span> &nbsp; R<sup>2</sup>={pearsonsR}</span>
    }
  </h5>
}
