import React, { useState, useEffect } from 'react'
import _clone from 'lodash/clone'

import StudyGeneField from './StudyGeneField'

export default function ExploreDisplayTabs({studyAccession, uniqueGenes, viewOptions, updateViewOptions}) {
  const showClusterTab = !viewOptions.genes
  return (
    <>
      <div className="row">
        <div className="col-md-4">
          <StudyGeneField genes={viewOptions.genes} setGenes={updateViewOptions} allGenes={uniqueGenes}/>
        </div>
        <div className="col-md-8">
          <ul className="nav nav-tabs" role="tablist" data-analytics-name="explore-default">
          { showClusterTab &&
            <li role="presentation" className="study-nav">
              <a onClick={() => updateViewOptions({tab: 'cluster'})}>Clusters</a>
            </li>
          }
          </ul>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12">
          { showClusterTab &&
            <span>Scatter here</span>

          }
        </div>
      </div>
    </>
  )
}
