/**
 * @fileoverview Functions for client-side usage analytics of SCP REST API
 */

import {
  formatTerms, getNumFacetsAndFilters
} from 'providers/StudySearchProvider'
import { log } from './metrics-api'

// See note in logSearch
let searchNumber = 0

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

/**
 * Log global study search metrics, one type of search done on home page
 */
export function logSearch(type, searchParams, perfTimes) {
  searchNumber += 1
  if (searchNumber < 3) {
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

  const terms = formatTerms(searchParams.terms)
  const numTerms = terms.length
  const genes = formatTerms(searchParams.genes)
  const numGenes = genes.length
  const facets = searchParams.facets
  const page = searchParams.page
  const preset = searchParams.preset

  const [numFacets, numFilters] = getNumFacetsAndFilters(facets)
  const facetList = facets ? Object.keys(facets) : []

  const filterListByFacet = getFriendlyFilterListByFacet(facets)

  const simpleProps = {
    terms, numTerms, genes, numGenes, page, preset,
    facetList, numFacets, numFilters,
    perfTimes,
    type, context: 'global'
  }
  const props = Object.assign(simpleProps, filterListByFacet)

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

/** perfTime helper: round all values in an object. */
function roundValues(props) {
  Object.keys(props).forEach(key => {
    props[key] = Math.round(props[key])
  })
  return props
}

/** Calculates generic performance timing metrics for visualizations */
export function calculatePerfTimes(perfTimes) {
  const now = performance.now()

  const plot = now - perfTimes.plotStart

  const perfEntry =
    performance.getEntriesByType('resource')
      .filter(entry => entry.name === perfTimes.url)[0]

  const transfer = perfEntry.responseEnd - perfEntry.responseStart

  const frontend = now - perfEntry.responseStart
  const frontendOther = frontend - plot - perfTimes.parse - transfer

  const backend = perfEntry.responseStart - perfEntry.requestStart

  const full = now - perfEntry.startTime

  const compressedSize = perfEntry.encodedBodySize
  const uncompressedSize = perfEntry.decodedBodySize
  const compressionBytesDiff = uncompressedSize - compressedSize

  const rawPerfProps = {
    // Server + client timing
    'perfTime:full': full, // Time from API call start to plot render end

    // Less precise, less complete times.  Retained for continuity.
    // Old `perfTime` was measured from API request start to response end,
    // which is very incomplete (lacks client times!) and less precise than
    // using browsers' PerformanceEntry API.
    'perfTime': perfTimes.legacy,
    'perfTime:legacy': perfTimes.legacy,

    // Server timing
    'perfTime:backend': backend, // Time for server to process request

    // Client timing
    'perfTime:frontend': frontend, // Time from API call response start to plot render end
    'perfTime:frontend:plot': plot, // Time from start to end of plot render call
    'perfTime:frontend:transfer': transfer, // Time client took to download data from server
    'perfTime:frontend:parse': perfTimes.parse, // Time to parse response body (currently only JSON)
    'perfTime:frontend:other': frontendOther, // Total frontend time - accounted segments

    // To answer questions about data sizes and compression
    'perfTime:data:compressed-size': compressedSize, // Encoded response body size in bytes
    'perfTime:data:uncompressed-size': uncompressedSize, // Decoded response body size in bytes
    'perfTime:data:compression-bytes-diff': compressionBytesDiff // Absolute amount compressed
  }

  const perfProps = roundValues(Object.assign({}, rawPerfProps))

  let compressionRatio = uncompressedSize / compressedSize
  // Round to 2 digits, e.g. "3.44".  Number.EPSILON ensures numbers like 1.005 round correctly.
  compressionRatio = Math.round((compressionRatio + Number.EPSILON) * 100) / 100
  perfProps['perfTime:data:compression-ratio'] = compressionRatio // Relative amount compressed


  // Accounts for `null`, '', 'non-empty string', etc.
  const errorKeys = Object.keys(rawPerfProps).filter(k => isNaN(parseFloat(rawPerfProps[k])))
  if (errorKeys.length > 0) {
    const specifics = errorKeys.map(k => `${k}: ${rawPerfProps[k]}\n`)
    throw Error(
      `Not all expected perfTime values are numbers:\n
      ${specifics}`
    )
  }

  perfProps['perfTime:url'] = perfTimes.url

  return perfProps
}

/** Logs violin plot metrics */
export function logViolinPlot(
  { genes, plotType, showPoints },
  perfTimes
) {
  const perfTimeProps = calculatePerfTimes(perfTimes)

  let props = { genes, plotType, showPoints }
  props = Object.assign(props, perfTimeProps)

  log('plot:violin', props)
}

/** Logs scatter plot metrics */
export function logScatterPlot(
  { scatter, genes, width, height },
  perfTimes
) {
  const perfTimeProps = calculatePerfTimes(perfTimes)

  let props = {
    'numPoints': scatter.numPoints, // How many cells are we plotting?
    genes,
    'gene': scatter.gene,
    'is3D': scatter.is3D,
    'layout:width': width, // Pixel width of graph
    'layout:height': height, // Pixel height of graph
    'numAnnotSelections': scatter.annotParams.values.length,
    'annotName': scatter.annotParams.name,
    'annotType': scatter.annotParams.type,
    'annotScope': scatter.annotParams.scope
  }

  props = Object.assign(props, perfTimeProps)

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
 * Log when a download is authorized.
 * This is our best web-client-side methodology for measuring downloads.
 */
export function logDownloadAuthorization(perfTimes) {
  const props = { perfTimes }
  log('download-authorization', props)
  ga('send', 'event', 'advanced-search', 'download-authorization') // eslint-disable-line no-undef, max-len
}
