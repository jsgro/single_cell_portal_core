import React, { useState, useEffect } from 'react'
import _clone from 'lodash/clone'

import StudyGeneField from './StudyGeneField'
import ScatterPlotGroup from './ScatterPlotGroup'
/*
 * Renders the gene search box and the tab selection
 * Responsible for determining which tabs are available for a given view of the study
 * @param {string} studyAccession  the study accession to visualize
 * @param {obj} exploreInfo  the object returned from a call to api/v1/studies/{study}/visualization/explore
 * @param {obj} viewOptions  object with cluster, annotation, and other viewing properties specified.
 * @param { function } updateViewOptions function for passing updates to the viewOptions object
 */
export default function ExploreDisplayTabs({studyAccession, exploreInfo, viewOptions, updateViewOptions}) {
  const showClusterTab = !viewOptions.genes
  function setGenes(geneString) {
    updateViewOptions({genes: geneString})
  }
  return (
    <>
      <div className="row">
        <div className="col-md-5">
          <StudyGeneField genes={viewOptions.genes}
                          setGenes={setGenes}
                          allGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
        </div>
        <div className="col-md-7">
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
            <ScatterPlotGroup viewOptions={viewOptions}  exploreInfo={exploreInfo}/>
          }
        </div>
      </div>
    </>
  )
}
