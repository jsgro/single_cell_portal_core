import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import _cloneDeep from 'lodash/clone'
import ReactNotification from 'react-notifications-component'

import ExploreDisplayTabs from './ExploreDisplayTabs'
import { getDefaultClusterParams } from 'lib/cluster-utils'
import MessageModal from 'lib/MessageModal'

import { fetchExplore, fetchStudyUserInfo } from 'lib/scp-api'
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

  /** load the basic study info, types of files, annotations, and clusters, etc... */
  async function loadStudyData() {
    const exploreResponse = await fetchExplore(studyAccession)
    setExploreInfo(exploreResponse)
    // after the explore info is received, fetch the user-specific study data, but do it
    // after a timeout to ensure the visualization data gets fetched first
    window.setTimeout(async () => {
      const userSpecificInfo = await fetchStudyUserInfo(studyAccession)
      setExploreInfo(oldExploreInfo => {
        const newInfo = _cloneDeep(oldExploreInfo)
        newInfo.annotationList.annotations = userSpecificInfo.annotations
        newInfo.canEdit = userSpecificInfo.canEdit
        if (userSpecificInfo.canCompute) {
          // show the analysis tab
          const fragment = document.createRange().createContextualFragment(userSpecificInfo.analysisTabContent)
          document.getElementById('study-analysis').appendChild(fragment)
          document.getElementById('study-analysis-nav').classList.remove('hidden')
        }
        return newInfo
      })
    }, 500)
  }

  useEffect(() => {loadStudyData()}, [studyAccession])

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
  let controlExploreParams = _cloneDeep(exploreParams)
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
      <ReactNotification />
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
