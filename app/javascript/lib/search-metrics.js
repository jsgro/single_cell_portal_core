import camelcaseKeys from 'camelcase-keys'

import { getNumFacetsAndFilters } from '~/providers/StudySearchProvider'
import { log } from '~/lib/metrics-api'

let prevNumSearches = -1
let numSearchSelections = 0

// See note in logSearch
let numSearchRequests = 0

// Number of searches insofar as usage analytics is concerned
export let numSearches = 0

const filterNamesById = {}

/**
 * Populates global id-to-name map of retrieved filters, for easier analytics.
 * See downstream use of window.SCP.filterNamesById in metrics-api.js.
 */
export function mapFiltersForLogging(facetsOrFilters, isFacets=false) {
  // If testing, skip.  Tech debt to reconsider later.
  if ('SCP' in window === false) {return}

  // This construct is kludgy, but helps cohesion and encapsulation
  // by putting related dense code here instead of in the calling functions
  if (isFacets) {
    const facets = facetsOrFilters
    facets.map(facet => {
      facet.filters.map(filter => {
        filterNamesById[filter.id] = filter.name
      })
    })
  } else {
    let filters = facetsOrFilters
    // handle facet filter search results
    if (facetsOrFilters.filters) {
      filters = facetsOrFilters.filters
    }
    filters.map(filter => {
      filterNamesById[filter.id] = filter.name
    })
  }
}

/** Converts raw searched terms to an array */
export function formatTerms(terms) {
  if (typeof terms === 'undefined' || terms === null) {return []}
  return terms.trim().split(/[, ]/).filter(term => term.length > 0)
}

/**
 * Log filter search metrics
 */
export function logFilterSearch(facet, terms) {
  const numTerms = formatTerms(terms).length

  const defaultProps = { facet, terms }
  const props = Object.assign(defaultProps, { numTerms })
  log('search-filter', props)

  // Google Analytics fallback: remove once Bard and Mixpanel are ready for SCP
  ga( // eslint-disable-line no-undef
    'send', 'event', 'advanced-search', 'search-filter',
    'num-terms', numTerms
  )
}

/**
 * Returns human-friendly list of applied filters for each facet
 *
 * This enables us to more feasibly answer "What filters are people using?"
 *
 * Renames keys in facets for easier discoverability as event properties in
 * Mixpanel.  E.g. instead of "disease" and "species", which will not appear
 * together in Mixpanel's alphabetized list, log these as "filtersDisease" and
 * "filtersSpecies".
 *
 * Also renames filters from opaque IDs (e.g. MONDO_0018076) to human-readable
 * labels (e.g. tuberculosis).
 */
function getFriendlyFilterListByFacet(facets) {
  const filterListByFacet = {}
  if (!facets) {
    return filterListByFacet
  }
  Object.entries(facets).forEach(([facet, filters]) => {
    const friendlyFacet = `filters${facet[0].toUpperCase() + facet.slice(1)}`
    const friendlyFilters = filters.map(filterId => {
      // This global variable is initialized in application.html.erb
      // and populated in scp-api.js
      return filterNamesById[filterId]
    })
    filterListByFacet[friendlyFacet] = friendlyFilters
  })
  return filterListByFacet
}

/** Format parts of query entered by the user to ease analysis in Mixpanel */
function getSearchQueryLogProps(searchedTerms, searchedGenes, searchedFacets) {
  const terms = formatTerms(searchedTerms)
  const termString = searchedTerms // Helps breakdowns by full query
  const numTerms = terms.length

  const genes = formatTerms(searchedGenes)
  const geneString = searchedGenes
  const numGenes = genes.length

  const facets = searchedFacets
  const [numFacets, numFilters] = getNumFacetsAndFilters(facets)
  const facetList = facets ? Object.keys(facets) : []
  const filterListByFacet = getFriendlyFilterListByFacet(facets)

  return {
    terms, termString, numTerms,
    genes, geneString, numGenes,
    numFacets, numFilters, facetList, filterListByFacet
  }
}

/**
 * Log global study search metrics, one type of search done on home page
 */
export function logSearch(type, searchParams, perfTimes, searchResults) {
  numSearchRequests += 1
  if (numSearchRequests < 3) {
    // This prevents over-reporting searches.
    //
    // Loading home page triggers 2 searches, which is a side-effect / artifact
    // with regard to tracking user interactions.  So do not log the first
    // two searches.
    //
    // To consider: integrate a way to determine which *interaction* triggered
    // search.  This was considered very early for separate reasons, but
    // abandoned as it was invasive.  The clearly-brittle nature of preventing
    // these artifactual searches shifts that cost-benefit, somewhat.
    return
  }

  numSearches += 1 // Number of searches insofar as usage analytics is concerned

  const {
    terms, termString, numTerms,
    genes, geneString, numGenes,
    numFacets, numFilters, facetList, filterListByFacet
  } = getSearchQueryLogProps(searchParams.terms, searchParams.genes, searchParams.facets)

  const page = searchParams.page
  const preset = searchParams.preset
  const scpStudiesMatchData = searchResults?.matchByData

  const simpleProps = {
    terms, termString, numTerms, genes, geneString, numGenes, page, preset,
    facetList, numFacets, numFilters,
    perfTimes, numSearches,
    type, context: 'global'
  }
  const props = Object.assign(simpleProps, filterListByFacet, scpStudiesMatchData)

  log('search', props)

  let gaEventCategory = 'advanced-search'
  // e.g. advanced-search-covid19
  if (
    preset !== '' &&
    typeof preset !== 'undefined'
  ) {
    gaEventCategory += `-${preset}`
  }

  // Google Analytics fallback: remove once Bard and Mixpanel are ready for SCP
  ga( // eslint-disable-line no-undef
    'send', 'event', gaEventCategory, 'study-search',
    'num-terms', numTerms
  )
}

/**
 * Log analytics about search result selection to Mixpanel
 *
 * This logging differentiates properties about the selected result from
 * properties about other aspects of the search -- e.g. the full result set
 * and query -- by prefixing the latter with a "namespace", i.e. `results:`.
 *
 * @param {Object} study Selected result
 * @param {Object} logProps Other properties to log
 *
 * TODO (SCP-4256): Refine search result selection logging
 * TODO (SCP-4257): Eliminate duplicate default/custom search event logging
 */
export function logSelectSearchResult(study, logProps={}) {
  logProps = Object.assign(
    {
      studyAccession: study.accession,
      context: 'study',
      scope: 'global'
    },
    study,
    logProps
  )
  delete logProps.accession // Redundant with more-conventional studyAccession

  Object.entries(logProps.results).forEach(([key, value]) => {
    if (['termList', 'geneList'].includes(key)) {
      // Redundant with pre-existing `terms` and `genes` Mixpanel props
      return
    }
    logProps[`results:${key}`] = value
  })
  delete logProps.results // Remove nested property; flattened above

  // Number of searches done before this result was selected.
  // This is needed to easily analyze changes in click-through rate (CTR).
  logProps.numSearches = numSearches

  // Number of selections done for the current search.  Users can click
  // multiple results for a given search, e.g. via command key + click, and
  // this property lets us account for that when analyzing CTR and related
  // metrics.
  if (numSearches !== prevNumSearches) {
    numSearchSelections = 1
    prevNumSearches = numSearches
  }
  logProps.numSearchSelections = numSearchSelections
  numSearchSelections += 1

  // We don't log study name, like Terra doesn't log workspace name, as it
  // might contain PII per original DSP Mixpanel design doc:
  // https://docs.google.com/document/d/1di8uwv-nDMNJp83Gs9Q_mlZp3q1DFboXGPLzbsbPyn8/edit
  delete logProps.name
  delete logProps.study_url // Has name
  delete logProps.description // Too similar to name
  delete logProps['results:studies'] // Includes above

  // Objects can't be queried in Mixpanel, so flatten matchByData
  if (logProps['results:matchByData'] !== null) {
    Object.entries(logProps['results:matchByData']).forEach(([key, value]) => {
      logProps[`results:${key}`] = value
    })
  }
  delete logProps['results:matchByData']

  const logPropsByRailsKey = {
    'results:totalStudies': 'results:numTotalStudies',
    'results:totalPages': 'results:numTotalPages',
    'results:gene_count': 'results:numGenes',
    'results:cell_count': 'results:numCells',
    'gene_count': 'numGenes',
    'cell_count': 'numCells'
  }
  let refinedLogProps = {}
  Object.entries(logProps).forEach(([key, value]) => {
    if (key in logPropsByRailsKey) {
      key = logPropsByRailsKey[key]
    }
    refinedLogProps[key] = value
  })

  refinedLogProps = camelcaseKeys(refinedLogProps)

  const searchQueryLogProps = getSearchQueryLogProps(
    logProps['results:terms'],
    logProps['results:genes'],
    {} // logProps['results:facets'] // TODO as part of SCP-4256
  )

  // Distinguish query parameters from "results" parameters
  Object.entries(searchQueryLogProps).forEach(([key, value]) => {
    delete refinedLogProps[`results:${key}`]
    refinedLogProps[`query:${key}`] = value
  })
  delete refinedLogProps[`results:facets`] // Refactor as part of SCP-4256

  log('select-search-result', refinedLogProps)
}
