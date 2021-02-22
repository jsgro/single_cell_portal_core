import React from 'react'

/** Renders a plot title for scatter plots */
export default function PlotTitle({ cluster, annotation, gene, isSpatial=false }) {
  let content
  if (!gene) {
    content = <span className="cluster-title">{cluster}</span>
  } else {
    content = <span className="cluster-title">
      {gene} - expression
    </span>
  }
  return <h5 className="plot-title">{ content } </h5>
}
