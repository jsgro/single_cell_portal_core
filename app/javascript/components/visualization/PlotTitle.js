import React from 'react'

/** Renders a plot title for scatter plots */
export default function PlotTitle({
  cluster, annotation, genes, consensus, subsample, isCorrelatedScatter, correlations
}) {
  let content = cluster
  let detailContent = ''
  if (genes.length) {
    let geneList = genes.map(gene => {
      return <span className="badge" key={gene}>{gene}</span>
    })
    if (isCorrelatedScatter) {
      geneList.splice(1, 0, <span key="vs"> vs. </span>)
    }

    detailContent = cluster
    if (consensus) {
      geneList.push(<span key="c">{consensus}</span>)
    }
    geneList.push(<span key="e"> expression</span>)
    content = geneList
  }
  if (subsample && subsample !== 'all') {
    detailContent = `subsample[${subsample}]`
  }
  return <h5 className="plot-title">
    <span className="cluster-title">{content} </span>
    <span className="detail"> {detailContent} </span>
    { isCorrelatedScatter && !!correlations.spearman &&
      <span className="correlation">
        Spearman rho = { Math.round(correlations.spearman * 1000) / 1000}
      </span>
    }
  </h5>
}
