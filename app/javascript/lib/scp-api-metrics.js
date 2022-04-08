/**
 * @fileoverview Functions for client-side usage analytics of SCP REST API
 */

import {
  formatTerms, getNumFacetsAndFilters
} from '~/providers/StudySearchProvider'
import { log } from './metrics-api'

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
export function formatQueryUserInput(searchedTerms, searchedGenes, searchedFacets) {
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
  } = formatQueryUserInput(searchParams.terms, searchParams.genes, searchParams.facets)

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

/** Logs violin plot metrics */
export function logViolinPlot(
  { genes, plotType, showPoints },
  perfTimes
) {
  const props = { genes, plotType, showPoints, perfTimes }

  log('plot:violin', props)
}

let numScatterPlotsSincePageLoad = 0
/** Logs scatter plot metrics */
export function logScatterPlot(
  { scatter, genes },
  perfTimes
) {
  numScatterPlotsSincePageLoad += 1
  const props = {
    'numPoints': scatter.numPoints, // How many cells are we plotting?
    genes,
    'genesPlotted': scatter.genes,
    'is3D': scatter.is3D,
    'numPointsPlotted': scatter.data.cells.length,
    'isSubsampled': scatter.isSubsampled,
    'subsample': scatter.subsample,
    'layout:width': scatter.width, // Pixel width of graph
    'layout:height': scatter.height, // Pixel height of graph
    'numAnnotSelections': scatter.annotParams.values.length,
    'annotName': scatter.annotParams.name,
    'annotType': scatter.annotParams.type,
    'annotScope': scatter.annotParams.scope,
    'isCorrelatedScatter': scatter.isCorrelatedScatter,
    'isAnnotatedScatter': scatter.isAnnotatedScatter,
    'isSpatial': scatter.isSpatial,
    perfTimes,
    numScatterPlotsSincePageLoad
  }

  log('plot:scatter', props)
}

/**
 * Log create user annotation metrics
 */
export function logCreateUserAnnotation() {
  ga('send', 'event', 'engaged_user_action', 'create_custom_cell_annotation')
  log('create-custom-cell-annotation')
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
 * Get common plot log event properties
 *
 * TODO as part of SCP-2736:
 * - Remove jQuery, generalize to also handle plot from React
 */
export function getLogPlotProps() {
  const genes = formatTerms($('#search_genes').val())

  const logProps = {
    currentTab: $('#view-tabs .study-nav.active').text().trim().toLowerCase(),
    genes,
    numGenes: genes.length,
    cluster: $('#search_cluster').val(),
    annotation: $('#search_annotation').val(),
    subsample: $('#search_subsample').val()
  }

  return logProps
}

/**
 * Extract the number of Azul files that have been chosen for download
 */
function getNumAzulFiles(azulFiles={}) {
  let totalNumFiles = 0
  for (const studyEntry of Object.entries(azulFiles)) {
    const [azulStudyId, fileList] = studyEntry
    totalNumFiles += fileList.length
  }

  return totalNumFiles
}

/**
 * Log when a download is authorized and the number of files from each source that are being downloaded.
 * fileIds is an array containing the file ids for SCP sourced files
 * azulFiles is an object with file info sourced from HCA files
 *
 * This is our best web-client-side methodology for measuring downloads.
 */
export function logDownloadAuthorization(perfTimes, fileIds, azulFiles) {
  const numAzulFiles = getNumAzulFiles(azulFiles)
  const props = { perfTimes, 'numSCPFiles': fileIds.length, numAzulFiles }
  log('download-authorization', props)
  ga('send', 'event', 'advanced-search', 'download-authorization') // eslint-disable-line no-undef, max-len
}
