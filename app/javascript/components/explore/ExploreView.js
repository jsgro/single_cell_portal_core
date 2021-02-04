import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router, navigate, useLocation } from '@reach/router'
import * as queryString from 'query-string'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretLeft, faCaretRight } from '@fortawesome/free-solid-svg-icons'

import ClusterControls from 'components/visualization/ClusterControls'
import ExploreDisplayTabs from './ExploreDisplayTabs'
import { stringifyQuery, fetchExplore } from 'lib/scp-api'

//

/* converts query string parameters into the viewOptions objet */
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

/* converts the viewOptions object into a query string, inverse of buildViewOptionsFromQuery */
function buildQueryFromViewOptions(viewOptions) {
  let querySafeOptions = _clone(viewOptions)
  const annot = viewOptions.annotation
  querySafeOptions.annotation = [annot.name, annot.type, annot.scope].join('--')
  return stringifyQuery(querySafeOptions)
}

/*
 * manages view options and basic layout for the explore tab
 * this component handles calling the api explore endpoint to get view options (clusters, etc..) for the study
 */
function RoutableExploreTab({studyAccession}) {
  const [exploreInfo, setExploreInfo] = useState(null)
  const location = useLocation()
  const [initialOptions, setInitialOptions] = useState(null)
  const [showViewOptions, setShowViewOptions] = useState(true)

  let viewOptions = buildViewOptionsFromQuery(location.search)
  if (initialOptions && !location.search) {
    // just render the defaults
    viewOptions = initialOptions
    viewOptions.isUserUpdated = false
  }

  function updateViewOptions(newOptions, isUserUpdated=true) {
    const mergedOpts = Object.assign({}, viewOptions, newOptions)
    if (!isUserUpdated) {
      // this is just default params being fetched from the server, so don't change the url
      setInitialOptions(mergedOpts)
    } else {
      const query = buildQueryFromViewOptions(mergedOpts)
      // view options settings should not add history entries
      // e.g. when a user hits 'back', it shouldn't undo their cluster selection,
      // it should take them to the page they were on before they came to the explore tab
      navigate(`${query}#study-visualize`, { replace: true })
    }

  }

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])

  let viewOptionsIcon = showViewOptions ? faCaretRight : faCaretLeft
  let [mainViewClass, controlPanelClass, optionsLinkClass ] = ['col-md-12', 'hidden', 'closed']
  if (showViewOptions) {
    [mainViewClass, controlPanelClass, optionsLinkClass] = ['col-md-10', 'col-md-2', 'open']
  }

  return (
    <div className="study-explore">

      <div className="row">
        <div className={mainViewClass}>
          <ExploreDisplayTabs studyAccession={studyAccession}
                              viewOptions={viewOptions}
                              updateViewOptions={updateViewOptions}
                              exploreInfo={exploreInfo}/>
        </div>
        <div className={controlPanelClass}>
          <ClusterControls studyAccession={studyAccession}
                           renderParams={ viewOptions }
                           setRenderParams={updateViewOptions}
                           preloadedAnnotationList={exploreInfo ? exploreInfo.annotationList : null}
                           fetchAnnotationList={false}/>

        </div>
      </div>
      <button className={`action view-options-toggle ${optionsLinkClass}`} onClick={() => setShowViewOptions(!showViewOptions)}>
        <FontAwesomeIcon className="fa-lg" icon={viewOptionsIcon}/> View Options
      </button>
    </div>
  )
}

/* wraps the explore tab in a Router object so it can use Reach hooks for routable parameters */
export default function ExploreTab({studyAccession}) {
  return (
    <Router>
      <RoutableExploreTab studyAccession={studyAccession} default/>
    </Router>
  )
}

/* convenience function for rendering this in a non-React part of the application */
export function renderExploreView(target, studyAccession) {
  ReactDOM.render(
    <ExploreTab studyAccession={studyAccession}/>,
    target
  )
}
