import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretLeft, faCaretRight, faLink } from '@fortawesome/free-solid-svg-icons'
import _clone from 'lodash/clone'

import ClusterControls from 'components/visualization/ClusterControls'
import SpatialSelector from './SpatialSelector'
import CreateAnnotation from './CreateAnnotation'
import PlotDisplayControls from 'components/visualization/PlotDisplayControls'
import ExploreDisplayTabs from './ExploreDisplayTabs'
import { fetchExplore } from 'lib/scp-api'
import useExploreTabRouter from './ExploreTabRouter'
import { getDefaultClusterParams, getDefaultSpatialGroupsForCluster } from 'lib/cluster-utils'


/**
 * manages view options and basic layout for the explore tab
 * this component handles calling the api explore endpoint to get view options (clusters, etc..) for the study
 */
function RoutableExploreTab({ studyAccession }) {
  const [exploreInfo, setExploreInfo] = useState(null)
  const [showViewOptionsControls, setShowViewOptionsControls] = useState(true)
  const [isCellSelecting, setIsCellSelecting] = useState(false)
  const [currentPointsSelected, setCurrentPointsSelected] = useState(null)
  const tabContainerEl = useRef(null)

  const {
    dataParams,
    updateDataParams,
    renderParams,
    updateRenderParams,
    routerLocation
  } = useExploreTabRouter()

  // we keep a separate 'controlDataParams' object that updates after defaults are fetched from the server
  // this is kept separate so that the graphs do not see the change in cluster name from '' to
  // '<<default cluster>>' as a change that requires a re-fetch from the server
  let controlDataParams = _clone(dataParams)
  if (exploreInfo && !dataParams.cluster) {
    // if the user hasn't specified anything yet, but we have the study defaults, use those
    controlDataParams = Object.assign(controlDataParams,
      getDefaultClusterParams(exploreInfo.annotationList, exploreInfo.spatialGroups))

    dataParams.spatialGroups = controlDataParams.spatialGroups
  }

  let hasSpatialGroups = false
  if (exploreInfo) {
    hasSpatialGroups = exploreInfo.spatialGroups.length > 0
  }

  /** in the event a component takes an action which updates the list of annotations available
    * e.g. by creating a user annotation, this updates the list */
  function setAnnotationList(newAnnotationList) {
    const newExploreInfo = Object.assign({}, exploreInfo, { annotationList: newAnnotationList })
    setExploreInfo(newExploreInfo)
  }

  /** copies the url to the clipboard */
  function copyLink(routerLocation) {
    navigator.clipboard.writeText(routerLocation.href)
  }

  /** handler for when the user selects points in a plotly scatter graph */
  function plotPointsSelected(points) {
    setCurrentPointsSelected(points)
  }

  /** Handle clicks on "View Options" toggler element */
  function handleViewOptionsClick() {
    setShowViewOptionsControls(!showViewOptionsControls)
  }

  function updateClusterDataParams(newParams) {
    if (newParams.cluster && !newParams.spatialGroups) {
      newParams.spatialGroups = getDefaultSpatialGroupsForCluster(newParams.cluster, exploreInfo.spatialGroups)
    }
    updateDataParams(newParams)
  }

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])

  // Toggle "View Options" panel
  const dataParamsIcon = showViewOptionsControls ? faCaretRight : faCaretLeft
  let [mainViewClass, controlPanelClass, optionsLinkClass] = ['col-md-12', 'hidden view-options', 'closed']
  if (showViewOptionsControls) {
    [mainViewClass, controlPanelClass, optionsLinkClass] = ['col-md-10', 'col-md-2 view-options', 'open']
  }

  return (
    <div className="study-explore">

      <div className="row">
        <div className={mainViewClass} ref={tabContainerEl}>
          <ExploreDisplayTabs studyAccession={studyAccession}
            dataParams={dataParams}
            controlDataParams={controlDataParams}
            renderParams={renderParams}
            showViewOptionsControls={showViewOptionsControls}
            updateDataParams={updateDataParams}
            updateRenderParams={updateRenderParams}
            exploreInfo={exploreInfo}
            isCellSelecting={isCellSelecting}
            plotPointsSelected={plotPointsSelected}/>
        </div>
        <div className={controlPanelClass}>

          <ClusterControls studyAccession={studyAccession}
            dataParams={controlDataParams}
            setDataParams={updateClusterDataParams}
            preloadedAnnotationList={exploreInfo ? exploreInfo.annotationList : null}
            fetchAnnotationList={false}
            showConsensus={dataParams.genes.length > 1}/>
          { hasSpatialGroups &&
            <SpatialSelector spatialGroups={exploreInfo.spatialGroups}
              dataParams={controlDataParams}
              updateDataParams={updateDataParams}/>
          }
          <CreateAnnotation
            isSelecting={isCellSelecting}
            setIsSelecting={setIsCellSelecting}
            annotationList={exploreInfo ? exploreInfo.annotationList : null}
            currentPointsSelected={currentPointsSelected}
            dataParams={controlDataParams}
            updateDataParams={updateDataParams}
            setAnnotationList={setAnnotationList}
            studyAccession={studyAccession}/>
          <PlotDisplayControls renderParams={renderParams}
            updateRenderParams={updateRenderParams}
            dataParams={controlDataParams}
            updateDataParams={updateDataParams}/>
          <button onClick={() => copyLink(routerLocation)}
            className="action"
            data-toggle="tooltip"
            title="copy a link to this visualization to the clipboard">
            Copy link <FontAwesomeIcon icon={faLink}/>
          </button>
        </div>
      </div>
      <a className={`action view-options-toggle ${optionsLinkClass}`}
        onClick={handleViewOptionsClick}>
        <FontAwesomeIcon className="fa-lg" icon={dataParamsIcon}/> View Options
      </a>
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
  ReactDOM.render(
    <ExploreTab studyAccession={studyAccession}/>,
    target
  )
}
