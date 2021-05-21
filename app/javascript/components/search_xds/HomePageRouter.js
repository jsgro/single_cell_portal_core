import { useEffect } from 'react'
import { navigate, useLocation } from '@reach/router'
import * as queryString from 'query-string'
import _cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'

import { stringifyQuery, geneParamToArray, geneArrayToParam, buildSearchQueryString, fetchSearch } from 'lib/scp-api'
import { buildParamsFromQuery as buildGeneParamsFromQuery } from './GeneSearchProvider'
import { getIdentifierForAnnotation } from 'lib/cluster-utils'
// import { logGlobalGeneSearch } from 'lib/metrics-api'

/**
 * manages view options and basic layout for the home page
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
      // logGlobalGeneSearch(homeParams.genes, 'url')
    }
  }, [])
  return { homeParams, updateHomeParams, routerLocation, clearHomeParams }
}

/**
 * renders a StudySearchContext tied to its props,
 * fires route navigate on changes to params
 */
export function PropsStudySearchProvider(props) {
  const startingState = _cloneDeep(emptySearch)
  startingState.params = props.searchParams
  // attach the perform and update methods to the context to avoid prop-drilling
  startingState.performSearch = performSearch
  startingState.updateSearch = updateSearch
  const [searchState, setSearchState] = useState(startingState)
  const searchParams = props.searchParams

  /**
   * Update search parameters in URL
   * @param {Object} newParams Parameters to update
   */
  function updateSearch(newParams) {
    const search = Object.assign({}, searchParams, newParams)
    search.facets = Object.assign({}, searchParams.facets, newParams.facets)
    // reset the page to 1 for new searches, unless otherwise specified
    search.page = newParams.page ? newParams.page : 1
    search.preset = undefined // for now, exclude preset from the page URL--it's in the component props instead
    const mergedParams = Object.assign(buildGeneParamsFromQuery(window.location.search), search)
    const queryString = buildSearchQueryString('study', mergedParams)
    navigate(`?${queryString}`)
  }

  /** perform the actual API search based on current params */
  async function performSearch() {
    // reset the scroll in case they scrolled down to read prior results
    window.scrollTo(0, 0)

    const results = await fetchSearch('study', searchParams)

    setSearchState({
      params: searchParams,
      isError: results.ok === false,
      isLoading: false,
      isLoaded: true,
      results,
      updateSearch
    })
  }

  if (!_isEqual(searchParams, searchState.params)) {
    performSearch()
    setSearchState({
      params: searchParams,
      isError: false,
      isLoading: true,
      isLoaded: false,
      results: [],
      updateSearch
    })
  }
  return (
    <StudySearchContext.Provider value={searchState}>
      <SearchSelectionProvider>{props.children}</SearchSelectionProvider>
    </StudySearchContext.Provider>
  )
}

/** Merges the received update into the homeParams, and updates the page URL if need */
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
  // it should take them to the page they were on before they came to the home page
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
  homeParams.page = queryParams.page ? parseInt(queryParams.page) : 1,
  homeParams.terms = queryParams.terms ? queryParams.terms : '',
  homeParams.facets = buildFacetsFromQueryString(queryParams.facets),
  homeParams.preset = preset ? preset : queryString.preset_search,
  homeParams.order = queryParams.order


  return homeParams
}

/** Deserializes "facets" URL parameter into facets object */
function buildFacetsFromQueryString(facetsParamString) {
  const facets = {}
  if (facetsParamString) {
    facetsParamString.split('+').forEach(facetString => {
      const facetArray = facetString.split(':')
      facets[facetArray[0]] = facetArray[1].split(',')
    })
  }
  return facets
}

/** converts the params objects into a query string, inverse of build*ParamsFromQuery */
function buildQueryFromParams(homeParams) {
  const querySafeOptions = {
    cluster: homeParams.cluster,
    annotation: getIdentifierForAnnotation(homeParams.annotation),
    subsample: homeParams.subsample,
    genes: geneArrayToParam(homeParams.genes),
    consensus: homeParams.consensus,
    geneList: homeParams.geneList,
    spatialGroups: homeParams.spatialGroups.join(','),
    heatmapRowCentering: homeParams.heatmapRowCentering,
    tab: homeParams.tab,
    scatterColor: homeParams.scatterColor,
    distributionPlot: homeParams.distributionPlot,
    distributionPoints: homeParams.distributionPoints,
    heatmapFit: homeParams.heatmapFit,
    bamFileName: homeParams.bamFileName,
    ideogramFileId: homeParams.ideogramFileId
  }

  if (querySafeOptions.spatialGroups === '' && homeParams.userSpecified['spatialGroups']) {
    querySafeOptions.spatialGroups = SPATIAL_GROUPS_EMPTY
  }
  // remove keys which were not user-specified
  Object.keys(querySafeOptions).forEach(key => {
    if (!homeParams.userSpecified[key] && !homeParams.userSpecified[key]) {
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
