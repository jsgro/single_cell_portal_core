import React, { useState } from 'react'
import _clone from 'lodash/clone'

import Study, { getByline } from 'components/search/results/Study'
import StudyGeneDotPlot from 'components/visualization/StudyGeneDotPlot'
import StudyViolinPlot from 'components/visualization/StudyViolinPlot'
import ClusterControls, {emptyRenderParams} from 'components/visualization/ClusterControls'



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

  const showDotPlot = study.gene_matches.length > 1 && !renderParams.collapseBy

  if (!study.can_visualize_clusters) {
    studyRenderComponent = (
      <div className="text-center">
        This study contains {study.gene_matches.join(', ')} in expression data.<br/>
          This study does not have cluster data to support visualization in the portal
      </div>
    )
  } else if (showDotPlot) {
    // render dotPlot for multigene searches that are not collapsed
    studyRenderComponent = <StudyGeneDotPlot study={study} genes={study.gene_matches} renderParams={renderParams}/>
  } else {
    // render violin for single genes or collapsed
    studyRenderComponent = <StudyViolinPlot study={study} genes={study.gene_matches} renderParams={renderParams} setAnnotationList={setAnnotationList}/>
  }

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
            fetchAnnotationList={showDotPlot}
            showCollapseBy={study.gene_matches.length > 1}
            preloadedAnnotationList={annotationList}/>
        </div>
      </div>

    </div>
  )
}
