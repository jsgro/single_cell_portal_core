import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import DotPlot from './DotPlot'
import ClusterControls from './ClusterControls'
import { getAnnotationCellValuesURL, getExpressionHeatmapURL } from 'lib/scp-api'

/** Renders a dotplot and associated cluster/annotation selection controls */
export default function StudyGeneDotPlot({ study, genes, renderParams }) {

  /** fetch the expression data from the server */
  async function updateAnnotation(params) {
    setClusterParams(params)
  }

  return (
    <>
      { renderParams.cluster &&
        <DotPlot
         expressionValuesURL={getExpressionHeatmapURL(study.accession, genes, renderParams.cluster)}
         annotationCellValuesURL={
           getAnnotationCellValuesURL(study.accession,
             renderParams.cluster,
             renderParams.annotation.name,
             renderParams.annotation.scope,
             renderParams.annotation.type,
             renderParams.subsample)
         }
         annotation={renderParams.annotation}/>
      }
      { !renderParams.cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
    </>
  )
}
