import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown, faCaretUp, faLink } from '@fortawesome/free-solid-svg-icons'
import _clone from 'lodash/clone'

import ClusterSelector from 'components/visualization/controls/ClusterSelector'
import AnnotationSelector from 'components/visualization/controls/AnnotationSelector'
import SubsampleSelector from 'components/visualization/controls/SubsampleSelector'
import { ExploreConsensusSelector } from 'components/visualization/controls/ConsensusSelector'
import SpatialSelector from 'components/visualization/controls/SpatialSelector'
import CreateAnnotation from 'components/visualization/controls/CreateAnnotation'
import PlotDisplayControls from 'components/visualization/PlotDisplayControls'
import ExploreDisplayTabs from './ExploreDisplayTabs'
import { fetchExplore } from 'lib/scp-api'
import useExploreTabRouter from './ExploreTabRouter'
import { getDefaultClusterParams, getDefaultSpatialGroupsForCluster } from 'lib/cluster-utils'
import GeneListSelector from 'components/visualization/controls/GeneListSelector'

/**
 * manages view options and basic layout for the explore tab
 * this component handles calling the api explore endpoint to get view options (clusters, etc..) for the study
 */
function RoutableExploreTab({ studyAccession }) {
  // stores the basic study overview data from the server, used to determine what views are available
  const [exploreInfo, setExploreInfo] = useState(null)
  // tracks whetehr the view options controls are open or closed
  const [showViewOptionsControls, setShowViewOptionsControls] = useState(true)
  // whether the user is in lasso-select mode for selecting points for an annotation
  const [isCellSelecting, setIsCellSelecting] = useState(false)
  // a plotly points_selected event
  const [currentPointsSelected, setCurrentPointsSelected] = useState(null)
  const tabContainerEl = useRef(null)

  const { exploreParams, updateExploreParams, routerLocation } = useExploreTabRouter()

  const annotationList = exploreInfo ? exploreInfo.annotationList : null

  // we keep a separate 'controlExploreParams' object that updates after defaults are fetched from the server
  // this is kept separate so that the graphs do not see the change in cluster name from '' to
  // '<<default cluster>>' as a change that requires a re-fetch from the server
  let controlExploreParams = _clone(exploreParams)
  if (exploreInfo && !exploreParams.cluster) {
    // if the user hasn't specified anything yet, but we have the study defaults, use those
    controlExploreParams = Object.assign(controlExploreParams,
      getDefaultClusterParams(annotationList, exploreInfo.spatialGroups))
    if (!exploreParams.userSpecified['spatialGroups']) {
      exploreParams.spatialGroups = controlExploreParams.spatialGroups
    } else {
      controlExploreParams.spatialGroups = exploreParams.spatialGroups
    }
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

  /** handles cluster selection to also populate the default spatial groups */
  function updateClusterParams(newParams) {
    if (newParams.cluster && !newParams.spatialGroups) {
      newParams.spatialGroups = getDefaultSpatialGroupsForCluster(newParams.cluster, exploreInfo.spatialGroups)
    }
    // if the user updates any cluster params, store all of them in the URL so we don't end up with
    // broken urls in the event of a default cluster/annotation changes
    const updateParams = {}
    const clusterParamNames = ['cluster', 'annotation', 'subsample', 'spatialGroups']
    clusterParamNames.forEach(param => {
      updateParams[param] = param in newParams ? newParams[param] : controlExploreParams[param]
    })
    updateExploreParams(updateParams)
  }

  /** handles gene list selection */
  function updateGeneList(geneList) {
    console.log('calling updateGeneList with ' + geneList)
    updateExploreParams({ geneList: geneList })
  }

  useEffect(() => {
    fetchExplore(studyAccession).then(result => setExploreInfo(result))
  }, [studyAccession])

  // Toggle "View Options" panel
  const viewOptionsIcon = showViewOptionsControls ? faCaretUp : faCaretDown
  let [mainViewClass, controlPanelClass, optionsLinkClass] = ['col-md-12', 'hidden view-options', 'closed']
  if (showViewOptionsControls) {
    [mainViewClass, controlPanelClass, optionsLinkClass] = ['col-md-10', 'col-md-2 view-options', 'open']
  }

  return (
    <div className="study-explore">

      <div className="row">
        <div className={mainViewClass} ref={tabContainerEl}>
          <ExploreDisplayTabs studyAccession={studyAccession}
            exploreParams={exploreParams}
            controlExploreParams={controlExploreParams}
            showViewOptionsControls={showViewOptionsControls}
            updateExploreParams={updateExploreParams}
            exploreInfo={exploreInfo}
            isCellSelecting={isCellSelecting}
            plotPointsSelected={plotPointsSelected}/>
        </div>
        <div className={controlPanelClass}>
          <div className="cluster-controls">
            <ClusterSelector
              annotationList={annotationList}
              cluster={controlExploreParams.cluster}
              annotation={controlExploreParams.annotation}
              updateClusterParams={updateClusterParams}
              spatialGroups={exploreInfo ? exploreInfo.spatialGroups : []}/>
            {hasSpatialGroups &&
              <SpatialSelector allSpatialGroups={exploreInfo.spatialGroups}
                spatialGroups={controlExploreParams.spatialGroups}
                updateSpatialGroups={spatialGroups => updateClusterParams({ spatialGroups })}/>
            }
            <AnnotationSelector
              annotationList={annotationList}
              cluster={controlExploreParams.cluster}
              annotation={controlExploreParams.annotation}
              updateClusterParams={updateClusterParams}/>
            <CreateAnnotation
              isSelecting={isCellSelecting}
              setIsSelecting={setIsCellSelecting}
              annotationList={exploreInfo ? exploreInfo.annotationList : null}
              currentPointsSelected={currentPointsSelected}
              cluster={controlExploreParams.cluster}
              annotation={controlExploreParams.annotation}
              subsample={controlExploreParams.subsample}
              updateClusterParams={updateClusterParams}
              setAnnotationList={setAnnotationList}
              studyAccession={studyAccession}/>
            <SubsampleSelector
              annotationList={annotationList}
              cluster={controlExploreParams.cluster}
              subsample={controlExploreParams.subsample}
              updateClusterParams={updateClusterParams}/>

            { exploreInfo?.geneLists?.length > 0 &&
              <GeneListSelector
                  geneList={controlExploreParams.geneList}
                  studyGeneLists={exploreInfo.geneLists}
                  updateGeneList={updateGeneList}/>
            }
            { exploreParams.genes.length > 1 &&
              <ExploreConsensusSelector
                consensus={controlExploreParams.consensus}
                updateConsensus={consensus => updateExploreParams({ consensus })}/>
            }
          </div>
          <PlotDisplayControls
            exploreParams={controlExploreParams}
            updateExploreParams={updateExploreParams}/>
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
        View Options <FontAwesomeIcon className="fa-lg" icon={viewOptionsIcon}/>
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
