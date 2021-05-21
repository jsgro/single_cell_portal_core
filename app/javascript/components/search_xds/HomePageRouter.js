import { useEffect } from 'react'
import { navigate, useLocation } from '@reach/router'
import * as queryString from 'query-string'

import { stringifyQuery, geneParamToArray, geneArrayToParam } from 'lib/scp-api'
import { getIdentifierForAnnotation } from 'lib/cluster-utils'
import { DEFAULT_ROW_CENTERING } from 'components/visualization/Heatmap'
// import { logGlobalGeneSearch } from 'lib/metrics-api'

/**
 * manages view options and basic layout for the explore tab
 * this component handles calling the API explore endpoint to get view options (clusters, etc..) for the study
 */
export default function useHomePageRouter() {
  const routerLocation = useLocation()
  const homeParams = buildHomeParamsFromQuery(routerLocation.search)

  /** reset to the default view for a study */
  function clearHomeParams() {
    navigate('')
  }

  useEffect(() => {
    // if this is the first render, and there are already genes specified, that means they came
    // from the URL directly
    if (homeParams.genes.length > 0) {
      // note that we can't pass the species list because we don't know it yet.
      // logGlobalGeneSearch(homeParams.genes, 'url')
    }
  }, [])
  return { homeParams, updateHomeParams, routerLocation, clearHomeParams }
}

/** Merges the received update into the exploreParams, and updates the page URL if need */
function updateHomeParams(newOptions, wasUserSpecified=true) {
  // rebuild the params from the actual URL to avoid races
  const search = location.search
  const currentParams = buildHomeParamsFromQuery(search)
  const mergedOpts = Object.assign({}, currentParams, newOptions)
  if (wasUserSpecified) {
    // this is just default params being fetched from the server, so don't change the URL
    Object.keys(newOptions).forEach(key => {
      mergedOpts.userSpecified[key] = true
    })
    // if the user does a gene search from the cluster view,
    // or if they've switched to/from consensus view
    // reset the tab to the default
    if (mergedOpts.tab === 'cluster' && newOptions.genes ||
        newOptions.consensus && !!newOptions.consensus != !!currentParams.consensus) {
      delete mergedOpts.tab
      delete mergedOpts.userSpecified.tab
    }
  }

  const query = buildQueryFromParams(mergedOpts)
  // view options settings should not add history entries
  // e.g. when a user hits 'back', it shouldn't undo their cluster selection,
  // it should take them to the page they were on before they came to the explore tab
  navigate(query, { replace: true })
}

/** converts query string parameters into the dataParams object */
function buildHomeParamsFromQuery(query) {
  const homeParams = {
    userSpecified: {}
  }
  const queryParams = queryString.parse(query)
  let annotation = {
    name: '',
    scope: '',
    type: ''
  }
  if (queryParams.annotation) {
    const [name, type, scope] = queryParams.annotation.split('--')
    annotation = { name, type, scope }
    if (name && name.length > 0) {
      homeParams.userSpecified.annotation = true
    }
  }

  PARAM_LIST_ORDER.forEach(param => {
    if (queryParams[param] && queryParams[param].length) {
      homeParams.userSpecified[param] = true
    }
  })
  homeParams.cluster = queryParams.cluster ? queryParams.cluster : ''
  homeParams.annotation = annotation
  homeParams.subsample = queryParams.subsample ? queryParams.subsample : ''
  homeParams.consensus = queryParams.consensus ? queryParams.consensus : null
  if (queryParams.spatialGroups === SPATIAL_GROUPS_EMPTY) {
    homeParams.spatialGroups = []
  } else {
    homeParams.spatialGroups = queryParams.spatialGroups ? queryParams.spatialGroups.split(',') : []
  }
  homeParams.genes = geneParamToArray(queryParams.genes)
  homeParams.geneList = queryParams.geneList ? queryParams.geneList : ''
  homeParams.heatmapRowCentering = queryParams.heatmapRowCentering ?
    queryParams.heatmapRowCentering :
    DEFAULT_ROW_CENTERING

  homeParams.scatterColor = queryParams.scatterColor ? queryParams.scatterColor : ''
  homeParams.distributionPlot = queryParams.distributionPlot ? queryParams.distributionPlot : ''
  homeParams.distributionPoints = queryParams.distributionPoints ? queryParams.distributionPoints : ''
  homeParams.tab = queryParams.tab ? queryParams.tab : ''
  homeParams.heatmapFit = queryParams.heatmapFit ? queryParams.heatmapFit : ''
  homeParams.bamFileName = queryParams.bamFileName ? queryParams.bamFileName : ''
  homeParams.ideogramFileId = queryParams.ideogramFileId ? queryParams.ideogramFileId : ''


  return homeParams
}

/** converts the params objects into a query string, inverse of build*ParamsFromQuery */
function buildQueryFromParams(exploreParams) {
  const querySafeOptions = {
    cluster: exploreParams.cluster,
    annotation: getIdentifierForAnnotation(exploreParams.annotation),
    subsample: exploreParams.subsample,
    genes: geneArrayToParam(exploreParams.genes),
    consensus: exploreParams.consensus,
    geneList: exploreParams.geneList,
    spatialGroups: exploreParams.spatialGroups.join(','),
    heatmapRowCentering: exploreParams.heatmapRowCentering,
    tab: exploreParams.tab,
    scatterColor: exploreParams.scatterColor,
    distributionPlot: exploreParams.distributionPlot,
    distributionPoints: exploreParams.distributionPoints,
    heatmapFit: exploreParams.heatmapFit,
    bamFileName: exploreParams.bamFileName,
    ideogramFileId: exploreParams.ideogramFileId
  }

  if (querySafeOptions.spatialGroups === '' && exploreParams.userSpecified['spatialGroups']) {
    querySafeOptions.spatialGroups = SPATIAL_GROUPS_EMPTY
  }
  // remove keys which were not user-specified
  Object.keys(querySafeOptions).forEach(key => {
    if (!exploreParams.userSpecified[key] && !exploreParams.userSpecified[key]) {
      delete querySafeOptions[key]
    }
  })

  return stringifyQuery(querySafeOptions, paramSorter)
}

/** controls list in which query string params are rendered into URL bar */
const PARAM_LIST_ORDER = ['geneList', 'genes', 'cluster', 'spatialGroups', 'annotation', 'subsample', 'consensus',
  'tab', 'scatterColor', 'distributionPlot', 'distributionPoints',
  'heatmapFit', 'heatmapRowCentering', 'bamFileName', 'ideogramFileId']
/** sort function for passing to stringify to ensure url params are specified in a user-friendly order */
function paramSorter(a, b) {
  return PARAM_LIST_ORDER.indexOf(a) - PARAM_LIST_ORDER.indexOf(b)
}
