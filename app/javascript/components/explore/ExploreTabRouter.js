import { navigate, useLocation } from '@reach/router'
import * as queryString from 'query-string'
import _clone from 'lodash/clone'

import { defaultRenderParams } from 'components/visualization/PlotDisplayControls'
import { stringifyQuery, geneParamToArray, geneArrayToParam } from 'lib/scp-api'
import { getIdentifierForAnnotation } from 'lib/cluster-utils'
import { DEFAULT_ROW_CENTERING } from 'components/visualization/Heatmap'

export const emptyDataParams = {
  cluster: '',
  annotation: '',
  subsample: '',
  consensus: null
}

/**
 * manages view options and basic layout for the explore tab
 * this component handles calling the api explore endpoint to get view options (clusters, etc..) for the study
 */
export default function useExploreTabRouter() {
  const routerLocation = useLocation()
  const dataParams = buildDataParamsFromQuery(routerLocation.search)
  const renderParams = buildRenderParamsFromQuery(routerLocation.search)


  /** Merges the received update into the dataParams, and updates the page URL if need */
  function updateDataParams(newOptions, wasUserSpecified=true) {
    const mergedOpts = Object.assign({}, dataParams, newOptions)

    const newRenderParams = _clone(renderParams)
    if (wasUserSpecified) {
      // this is just default params being fetched from the server, so don't change the url
      Object.keys(newOptions).forEach(key => {
        mergedOpts.userSpecified[key] = true
      })
      if (newOptions.consensus || newOptions.genes) {
        // if the user does a gene search or changes the consensus, switch back to the default tab
        delete newRenderParams.tab
        delete newRenderParams.userSpecified.tab
      }
    }

    const query = buildQueryFromParams(mergedOpts, newRenderParams)
    // view options settings should not add history entries
    // e.g. when a user hits 'back', it shouldn't undo their cluster selection,
    // it should take them to the page they were on before they came to the explore tab
    navigate(`${query}#study-visualize`, { replace: true })
  }

  /** Merges the received update into the renderParams, and updates the page URL if need */
  function updateRenderParams(newOptions, wasUserSpecified=true) {
    const mergedOpts = Object.assign({}, renderParams, newOptions)
    if (wasUserSpecified) {
      // this is just default params being fetched from the server, so don't change the url
      Object.keys(newOptions).forEach(key => {
        mergedOpts.userSpecified[key] = true
      })
    }
    const query = buildQueryFromParams(dataParams, mergedOpts)
    // view options settings should not add history entries
    navigate(`${query}#study-visualize`, { replace: true })
  }

  return { dataParams, updateDataParams, renderParams, updateRenderParams, routerLocation }
}

/** converts query string parameters into the dataParams objet */
function buildDataParamsFromQuery(query) {
  const dataParams = {
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
      dataParams.userSpecified.annotation = true
    }
  }

  const paramList = ['cluster', 'subsample', 'consensus', 'spatialGroups', 'genes', 'tab', 'heatmapRowCentering']
  paramList.forEach(param => {
    if (queryParams[param] && queryParams[param].length) {
      dataParams.userSpecified[param] = true
    }
  })
  dataParams.cluster = queryParams.cluster ? queryParams.cluster : ''
  dataParams.annotation = annotation
  dataParams.subsample = queryParams.subsample ? queryParams.subsample : ''
  dataParams.consensus = queryParams.consensus ? queryParams.consensus : null
  dataParams.spatialGroups = queryParams.spatialGroups ? queryParams.spatialGroups.split(',') : []
  dataParams.genes = geneParamToArray(queryParams.genes)
  dataParams.heatmapRowCentering = queryParams.heatmapRowCentering ? queryParams.heatmapRowCentering : DEFAULT_ROW_CENTERING
  return dataParams
}

/** converts the params objects into a query string, inverse of build*ParamsFromQuery */
function buildQueryFromParams(dataParams, renderParams) {
  const querySafeOptions = {
    cluster: dataParams.cluster,
    annotation: getIdentifierForAnnotation(dataParams.annotation),
    subsample: dataParams.subsample,
    genes: geneArrayToParam(dataParams.genes),
    consensus: dataParams.consensus,
    spatialGroups: dataParams.spatialGroups.join(','),
    heatmapRowCentering: dataParams.heatmapRowCentering,
    tab: renderParams.tab,
    scatterColor: renderParams.scatterColor,
    distributionPlot: renderParams.distributionPlot,
    distributionPoints: renderParams.distributionPoints,
    heatmapFit: renderParams.heatmapFit,
    bamFileName: renderParams.bamFileName
  }
  // remove keys which were not user-specified
  Object.keys(querySafeOptions).forEach(key => {
    if (!dataParams.userSpecified[key] && !renderParams.userSpecified[key]) {
      delete querySafeOptions[key]
    }
  })

  return stringifyQuery(querySafeOptions, paramSorter)
}

const PARAM_LIST_ORDER = ['genes', 'cluster', 'spatialGroups', 'annotation', 'subsample', 'consensus', 'tab',
  'scatterColor', 'distributionPlot', 'distributionPoints', 'heatmapFit', 'heatmapRowCentering', 'bamFileName']
/** sort function for passing to stringify to ensure url params are specified in a user-friendly order */
function paramSorter(a, b) {
  return PARAM_LIST_ORDER.indexOf(a) - PARAM_LIST_ORDER.indexOf(b)
}

/** converts query string params into the renderParams object, which controls plot visualization customization */
function buildRenderParamsFromQuery(query) {
  const queryParams = queryString.parse(query)
  const renderParams = _clone(defaultRenderParams)
  renderParams.userSpecified = {}
  const urlProps = ['scatterColor', 'distributionPlot', 'distributionPoints', 'tab', 'heatmapFit', 'bamFileName']
  urlProps.forEach(optName => {
    if (queryParams[optName] && queryParams[optName].length) {
      renderParams[optName] = queryParams[optName]
      renderParams.userSpecified[optName] = true
    }
  })
  return renderParams
}
