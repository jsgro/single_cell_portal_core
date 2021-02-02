import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router, navigate, useLocation } from '@reach/router'
import * as queryString from 'query-string'
import _clone from 'lodash/clone'

import ClusterControls from 'components/visualization/ClusterControls'
import ExploreDisplayTabs from './ExploreDisplayTabs'
import { stringifyQuery, fetchExplore } from 'lib/scp-api'

// manages view options and basic layout for the explore tab


function buildViewOptionsFromQuery(query) {
  const queryParams = queryString.parse(query)
  let annotation = {
    name: '',
    scope: '',
    type: ''
  }
  if (queryParams.annotation) {
    const [name, type, scope] = queryParams.annotation.split('--')
    annotation = {name, type, scope}
  }
  return {
    cluster: queryParams.cluster ? queryParams.cluster : '',
    annotation: annotation,
    subsample: queryParams.subsample ? queryParams.subsample : '',
    collapseBy: queryParams.collapseBy ? queryParams.collapseBy : null,
    spatialFiles: queryParams.spatialFiles ? queryParams.spatialFiles.split(',') : [],
    genes: queryParams.genes ? queryParams.genes : '',
  }
}

function buildQueryFromViewOptions(viewOptions) {
  let querySafeOptions = _clone(viewOptions)
  const annot = viewOptions.annotation
  querySafeOptions.annotation = [annot.name, annot.type, annot.scope].join('--')
  return stringifyQuery(querySafeOptions)
}


function RoutableViewOptions({studyAccession}) {
  const [exploreInfo, setExploreInfo] = useState(null)
  const location = useLocation()

  const viewOptions = buildViewOptionsFromQuery(location.search)

  function updateViewOptions(newOptions) {
    const mergedOpts = Object.assign({}, viewOptions, newOptions)
    const query = buildQueryFromViewOptions(mergedOpts)
    // view options settings should not add history entries
    // e.g. when a user hits 'back', it shouldn't undo their cluster selection,
    // it should take them to the page they were on before they came to the explore tab
    navigate(`${query}#study-visualize`, { replace: true })
  }

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])

  return (
    <div className="row">
      <div className="col-md-10">
        <ExploreDisplayTabs studyAccession={studyAccession}
                            viewOptions={viewOptions}
                            updateViewOptions={updateViewOptions}
                            uniqueGenes={exploreInfo ? exploreInfo.uniqueGenes : []}/>
      </div>
      <div className="col-md-2">
        { exploreInfo &&
          <ClusterControls studyAccession={studyAccession}
                           renderParams={ viewOptions }
                           setRenderParams={updateViewOptions}
                           preloadedAnnotationList={exploreInfo.annotationList}
                           fetchAnnotationList={false}/>
        }
      </div>
    </div>
  )
}

export default function ExploreTab({studyAccession}) {
  return (
    <Router>
      <RoutableViewOptions studyAccession={studyAccession} default/>
    </Router>
  )
}

export function renderExploreView(target, studyAccession) {
  ReactDOM.render(
    <ExploreTab studyAccession={studyAccession}/>,
    target
  )
}
