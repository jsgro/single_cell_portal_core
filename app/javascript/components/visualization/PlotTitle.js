import React from 'react'

/** Renders a plot title for scatter plots */
export default function PlotTitle({ cluster, annotation, gene, consensus, subsample }) {
  let contentString = cluster
  let detailString = ''
  if (gene) {
    contentString = `${gene} - expression`
    detailString = cluster
    if (consensus) {
      contentString = `${gene} - ${consensus} expression`
    } else {
      contentString = `${gene} - expression`
    }
  }
  if (subsample && subsample !== 'all') {
    detailString += ` subsample[${subsample}]`
  }
  return <h5 className="plot-title">
    <span className="cluster-title">{contentString} </span>
    <span className="detail"> {detailString}</span>
  </h5>
}
