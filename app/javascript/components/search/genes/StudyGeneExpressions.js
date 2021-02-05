import React, { useState, useEffect } from 'react'
import _clone from 'lodash/clone'

import Study, { getByline } from 'components/search/results/Study'
import DotPlot from 'components/visualization/DotPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import ClusterControls, { emptyRenderParams, getAnnotationValues } from 'components/visualization/ClusterControls'
import { fetchClusterOptions } from 'lib/scp-api'



/** Renders expression data for a study.  This assumes that the study has a 'gene_matches' property
    to inform which genes to show data for
  */
export default function StudyGeneExpressions({ study }) {
  const [renderParams, setRenderParams] = useState(_clone(emptyRenderParams))
  const [annotationList, setAnnotationList] = useState(null)

  let studyRenderComponent
  if (!study.gene_matches) {
    return <Study study={study}/>
  }

  const showDotPlot = study.gene_matches.length > 1 && !renderParams.consensus

  if (!study.can_visualize_clusters) {
    studyRenderComponent = (
      <div className="text-center">
        This study contains {study.gene_matches.join(', ')} in expression data.<br/>
          This study does not have cluster data to support visualization in the portal
      </div>
    )
  } else if (showDotPlot) {
    // render dotPlot for multigene searches that are not collapsed
    const annotationValues = getAnnotationValues(renderParams.annotation,
                                                 annotationList ? annotationList.annotations : [])
    studyRenderComponent = <DotPlot studyAccession={study.accession}
      genes={study.gene_matches}
      renderParams={renderParams}
      annotationValues={annotationValues}/>
  } else {
    // render violin for single genes or collapsed
    studyRenderComponent = <StudyViolinPlot studyAccession={study.accession} genes={study.gene_matches} renderParams={renderParams} setAnnotationList={setAnnotationList}/>
  }

  useEffect(() => {
    // if showing a dotplot, we need to fetch the annotation values to feed into morpheus
    if (showDotPlot) {
      fetchClusterOptions(study.accession).then(newAnnotationList => setAnnotationList(newAnnotationList))
    }
  }, [study.accession])

  return (
    <div className="study-gene-result">
      <label htmlFor={study.name} id= 'result-title'>
        <a href={study.study_url} >{ study.name }</a>
      </label>
      <div ><em>{ getByline(study.description) }</em></div>
      <div>
        <span className='badge badge-secondary cell-count'>
          {study.cell_count} Cells
        </span>
        {
          study.gene_matches.map(geneName => {
            return (<span key={geneName} className='badge gene-match'>
              { geneName }
            </span>)
          })
        }
      </div>
      <div className="row graph-container">
        <div className="col-md-10">
          { studyRenderComponent }
        </div>
        <div className="col-md-2 graph-controls">
          <ClusterControls
            studyAccession={study.accession}
            setRenderParams={setRenderParams}
            renderParams={renderParams}
            fetchAnnotationList={false}
            showConsensus={study.gene_matches.length > 1}
            preloadedAnnotationList={annotationList}/>
        </div>
      </div>

    </div>
  )
}
