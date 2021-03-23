import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'

import ExploreDisplayTabs from './ExploreDisplayTabs'
import { fetchExplore } from 'lib/scp-api'
import useExploreTabRouter from './ExploreTabRouter'
import { log } from 'lib/metrics-api'

/**
 * manages the url params and fetching the basic study info that determines what options to show
 */
function RoutableExploreTab({ studyAccession }) {
  // stores the basic study overview data from the server, used to determine what views are available
  const [exploreInfo, setExploreInfo] = useState(null)
  const { exploreParams, updateExploreParams, routerLocation } = useExploreTabRouter()

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])



  return (
    <div className="study-explore">
      <ExploreDisplayTabs studyAccession={studyAccession}
        exploreParams={exploreParams}
        updateExploreParams={updateExploreParams}
        exploreInfo={exploreInfo}/>
    </div>
  )
}

/** wraps the explore tab in a Router object so it can use React hooks for routable parameters */
export default function ExploreTab({ studyAccession }) {
  return (
    <Router>
      <RoutableExploreTab studyAccession={studyAccession} default/>
    </Router>
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
