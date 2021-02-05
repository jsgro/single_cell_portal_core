import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDna } from '@fortawesome/free-solid-svg-icons'

import DotPlot from './DotPlot'
import { getAnnotationCellValuesURL, getExpressionHeatmapURL } from 'lib/scp-api'

/** Renders a dotplot and associated cluster/annotation selection controls */
export default function StudyGeneDotPlot({ studyAccession, genes, renderParams, annotationValues }) {

  return (
    <>
      { renderParams.cluster &&
        <DotPlot
          expressionValuesURL={getExpressionHeatmapURL(studyAccession, genes, renderParams.cluster)}
          annotationCellValuesURL={
            getAnnotationCellValuesURL(studyAccession,
              renderParams.cluster,
              renderParams.annotation.name,
              renderParams.annotation.scope,
              renderParams.annotation.type,
              renderParams.subsample)
          }
          annotation={renderParams.annotation}
          annotationValues={annotationValues}/>
      }
      { !renderParams.cluster && <FontAwesomeIcon icon={faDna} className="gene-load-spinner"/> }
    </>
  )
}
