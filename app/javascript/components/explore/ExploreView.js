import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import _clone from 'lodash/clone'

import ExploreDisplayTabs from './ExploreDisplayTabs'
import { getDefaultClusterParams } from 'lib/cluster-utils'
import MessageModal from 'lib/MessageModal'

import { fetchExplore } from 'lib/scp-api'
import ErrorBoundary from 'lib/ErrorBoundary'
import useExploreTabRouter from './ExploreTabRouter'

/**
 * manages the url params and fetching the basic study info that determines what options to show
 */
function RoutableExploreTab({ studyAccession }) {
  // stores the basic study overview data from the server, used to determine what views are available
  const [exploreInfo, setExploreInfo] = useState(null)
  const { exploreParams, updateExploreParams, clearExploreParams, routerLocation } = useExploreTabRouter()

  // we keep a separate 'exploreParamsWithDefaults' object that updates after defaults are fetched from the server
  // this is kept separate so that the graphs do not see the change in cluster name from '' to
  // '<<default cluster>>' as a change that requires a re-fetch from the server
  const exploreParamsWithDefaults = createExploreParamsWithDefaults(exploreParams, exploreInfo)

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])

  useEffect(() => {
    // if the user hasn't selected anything, and there are genelists to view, but no clusters
    // default to the first gene list
    if ((exploreInfo && exploreInfo.annotationList.clusters.length === 0 &&
      exploreInfo.geneLists.length && !exploreParams.tab && !exploreParams.geneList)) {
      updateExploreParams({ geneList: exploreInfo.geneLists[0] })
    }
  }, [exploreInfo?.geneLists])

  return (
    <div className="study-explore">
      <MessageModal/>
      <ExploreDisplayTabs studyAccession={studyAccession}
        exploreParams={exploreParams}
        clearExploreParams={clearExploreParams}
        exploreParamsWithDefaults={exploreParamsWithDefaults}
        updateExploreParams={updateExploreParams}
        routerLocation={routerLocation}
        exploreInfo={exploreInfo}
        setExploreInfo={setExploreInfo}/>
    </div>
  )
}

/** returns a clone of exploreParams with appropriate defaults from exploreInfo merged in */
function createExploreParamsWithDefaults(exploreParams, exploreInfo) {
  let controlExploreParams = _clone(exploreParams)
  if (exploreInfo && !exploreParams.cluster && exploreInfo.clusterGroupNames.length > 0) {
    // if the user hasn't specified anything yet, but we have the study defaults, use those
    controlExploreParams = Object.assign(controlExploreParams,
      getDefaultClusterParams(exploreInfo.annotationList, exploreInfo.spatialGroups))
    if (!exploreParams.userSpecified['spatialGroups']) {
      exploreParams.spatialGroups = controlExploreParams.spatialGroups
    } else {
      controlExploreParams.spatialGroups = exploreParams.spatialGroups
    }
  }
  if (!exploreParams.userSpecified['scatterColor'] && exploreInfo?.colorProfile) {
    controlExploreParams.scatterColor = exploreInfo.defaultColorProfile
  }
  return controlExploreParams
}

/** wraps the explore tab in a Router object so it can use React hooks for routable parameters */
export default function ExploreTab({ studyAccession }) {
  return (
    <ErrorBoundary>
      <Router>
        <RoutableExploreTab studyAccession={studyAccession} default/>
      </Router>
    </ErrorBoundary>
  )
}

/** convenience function for rendering this in a non-React part of the application */
export function renderExploreView(target, studyAccession) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ExploreTab studyAccession={studyAccession}/>,
    target
  )
}
