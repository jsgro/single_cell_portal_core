/**
 * @fileoverview JavaScript client for Single Cell Portal REST API
 *
 * Succinct, well-documented SCP API wrappers, also enabling easy mocks
 *
 * API docs: https://singlecell.broadinstitute.org/single_cell/api
 */
import React from 'react'
import camelcaseKeys from 'camelcase-keys'
import _compact from 'lodash/compact'
import * as queryString from 'query-string'

import { getAccessToken } from 'providers/UserProvider'
import {
  logSearch, logDownloadAuthorization, logCreateUserAnnotation,
  mapFiltersForLogging
} from './scp-api-metrics'
import { showMessage } from 'lib/MessageModal'

// If true, returns mock data for all API responses.  Only for dev.
let globalMock = false

const defaultBasePath = '/single_cell/api/v1'

/** Get default `init` object for SCP API fetches */
export function defaultInit() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
  // accessToken is a blank string when not signed in
  if (getAccessToken() !== '') {
    headers['Authorization'] = `Bearer ${getAccessToken()}`
  }
  return {
    method: 'GET',
    headers
  }
}

/** convert a gene param string to an array of individual gene names */
export function geneParamToArray(genes) {
  return genes ? genes.split(',') : []
}

/** convert a gene array to a gene param string */
export function geneArrayToParam(genes) {
  return genes ? genes.join(',') : ''
}


/** Configure an `init` for `fetch` to use POST, and respect any mocking  */
function defaultPostInit(mock=false) {
  let init = defaultInit
  if (mock === false && globalMock === false) {
    init = Object.assign({}, defaultInit(), {
      method: 'POST'
    })
  }

  return init
}

/**
 * Create and return a one-time authorization code for download
 *
 * TODO:
 * - Update API to use "expires_in" instead of "time_interval"
 *
 * Docs: https:///singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/Search/search_auth_code_path
 *
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 * @returns {Promise} Promise object described in "Example return" above
 *
 * @example
 *
 * // returns {authCode: 123456, timeInterval: 1800}
 * fetchAuthCode(true)
 */
export async function fetchAuthCode(fileIds, tdrFiles, mock=false) {
  const init = defaultPostInit(mock)
  init.body = JSON.stringify({
    file_ids: fileIds,
    tdr_files: tdrFiles
  })
  const [authCode, perfTimes] = await scpApi('/bulk_download/auth_code', init, mock)

  logDownloadAuthorization(perfTimes)

  return authCode
}

/**
* Create user annotation
*
* A "user annotation" is a named object of arrays.  Each item has a label
* (`name`) and cell names (`values`).  Signed-in users can create these
* custom annotations in the Explore tab of the Study Overview page.
*
* See user-annotations.js for more context.
*
* @param {String} studyAccession Study accession, e.g. SCP123
* @param {String} cluster Name of cluster, as defined at upload
* @param {String} annotation Full annotation name, e.g. "CLUSTER--group--study"
* @param {String} subsample Subsampling threshold, e.g. 10000
* @param {String} userAnnotationName Name of new annotation
* @param {Object} selections User selections for new annotation.
*    Each selection has a label (`name`) and list of cell names (`values`).
*    See `prepareForApi` in `user-annotations.js` for details.
*/
export async function createUserAnnotation(
  studyAccession, cluster, annotation, subsample,
  userAnnotationName, selections, mock=false
) {
  const init = defaultPostInit(mock)

  init.body = JSON.stringify({
    name: userAnnotationName,
    user_data_arrays_attributes: selections,
    cluster, annotation, subsample
  })

  const apiUrl = `/studies/${studyAccession}/user_annotations`

  const [response] = await scpApi(apiUrl, init, mock)

  // Parse JSON of successful response
  const message = response.message
  const annotations = response.annotations
  const newAnnotations = response.annotationList

  logCreateUserAnnotation()

  return { message, annotations, newAnnotations }
}

/**
 * Returns list of all available search facets, including default filter values
 *
 * Docs: https:///singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/Search/search_facets_path
 *
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 * @returns {Promise} Promise object containing camel-cased data from API
 */
export async function fetchFacets(mock=false) {
  let path = '/search/facets'
  const brandingGroup = getBrandingGroup()
  if (brandingGroup) {
    path = `${path}?scpbr=${brandingGroup}`
  }

  const [facets] = await scpApi(path, defaultInit(), mock)

  mapFiltersForLogging(facets, true)

  return facets
}

/**
 * Sets flag on If using mock data for all API responses.
 *
 * This method is useful for tests and certain development scenarios,
 * e.g. when evolving a new API or to work around occasional API blockers.
 *
 * @param {Boolean} flag If using mock data for all API responses
 */
export function setGlobalMockFlag(flag) {
  globalMock = flag
}

// Modifiable in setMockOrigin, used in unit tests
let mockOrigin = ''

/**
 * Sets origin (e.g. http://localhost:3000) for mocked SCP API URLs
 *
 * This enables mock data to be used from Jest tests
 *
 * @param {Boolean} origin Origin (e.g. http://localhost:3000) for mocked SCP API URLs
 */
export function setMockOrigin(origin) {
  mockOrigin = origin
}

/** Constructs and encodes URL parameters; omits those with no value */
export function stringifyQuery(paramObj, sort) {
  // Usage and API: https://github.com/sindresorhus/query-string#usage
  const options = { skipEmptyString: true, skipNull: true, sort }
  const stringified = queryString.stringify(paramObj, options)
  return `?${stringified}`
}

/**
 * Returns initial content for the upload file wizard
 *
 * @param {String} studyAccession Study accession
*/
export async function fetchStudyFileInfo(studyAccession, mock=false) {
  const apiUrl = `/studies/${studyAccession}/file_info`
  const [exploreInit] = await scpApi(apiUrl, defaultInit(), mock, false)
  return exploreInit
}

/**
 * Creates a new study file
 *
 * @param {String} studyAccession study accession
 * @param {FormData} studyFileData html FormData object with the file data
*/
export async function createStudyFile({
  studyAccession,
  studyFileData,
  isChunked=false,
  chunkStart,
  chunkEnd,
  fileSize,
  onProgress,
  mock=false
}) {
  const apiUrl = `/studies/${studyAccession}/study_files`
  const init = Object.assign({}, defaultInit(), {
    method: 'POST',
    body: studyFileData
  })

  setFileFormHeaders(init.headers, isChunked, chunkStart, chunkEnd, fileSize)
  return await scpApiXmlHttp({ apiUrl, init, formData: studyFileData, onProgress })
}

/** Adds a content range header if needed */
function setFileFormHeaders(headers, isChunked, chunkStart, chunkEnd, fileSize) {
  // we want the browser to auto-set the content type with the right form boundaries
  // see https://stackoverflow.com/questions/36067767/how-do-i-upload-a-file-with-the-js-fetch-api
  delete headers['Content-Type']
  if (isChunked) {
    headers['Content-Range'] = `bytes ${chunkStart}-${chunkEnd-1}/${fileSize}`
  }
}


/**
 * Updates a study file
 *
 * @param {String} studyAccession study accession
 * @param {String} studyFileId Study file id
 * @param {FormData} studyFileData html FormData object with the file data
*/
export async function updateStudyFile({
  studyAccession,
  studyFileId,
  studyFileData,
  isChunked=false,
  chunkStart,
  chunkEnd,
  fileSize,
  onProgress,
  mock=false
}) {
  const apiUrl = `/studies/${studyAccession}/study_files/${studyFileId}`
  const init = Object.assign({}, defaultInit(), {
    method: 'PATCH'
  })
  setFileFormHeaders(init.headers, isChunked, chunkStart, chunkEnd, fileSize)
  return await scpApiXmlHttp({ apiUrl, init, formData: studyFileData, onProgress })
}

/**
 * Updates a study file
 *
 * @param {String} studyAccession study accession
 * @param {String} studyFileId Study file id
 * @param {FormData} studyFileData html FormData object with the file data
*/
export async function sendStudyFileChunk({
  studyAccession,
  studyFileId,
  studyFileData,
  chunkStart,
  chunkEnd,
  fileSize,
  onProgress,
  mock=false
}) {
  const apiUrl = `/studies/${studyAccession}/study_files/${studyFileId}/chunk`
  const init = Object.assign({}, defaultInit(), {
    method: 'PATCH',
    body: studyFileData
  })
  setFileFormHeaders(init.headers, true, chunkStart, chunkEnd, fileSize)
  return await scpApiXmlHttp({ apiUrl, init, formData: studyFileData, onProgress })
}

/**
 * Deletes the given file
 *
 * @param {String} studyAccession Study accession
 * @param {fileId} the guid of the file to delete
*/
export async function deleteStudyFile(studyAccession, fileId, mock=false) {
  const apiUrl = `/studies/${studyAccession}/study_files/${fileId}`
  const init = Object.assign({}, defaultInit(), {
    method: 'DELETE'
  })
  const [exploreInit] = await scpApi(apiUrl, init, mock, false)
  return exploreInit
}


/**
 * Fetches a given resource from a GCP bucket -- this handles adding the
 * appropriate SCP readonly bearer token, and using the Google API URL that allows CORS
 *
 * @param {String} bucketName bucket name
 * @param {String} fileName file name
*/
export async function fetchBucketFile(bucketName, fileName, mock=false) {
  const init = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${window.SCP.readOnlyToken}`
    }
  }
  const url = `https://storage.googleapis.com/download/storage/v1/b/${bucketName}/o/${fileName}?alt=media`

  const response = await fetch(url, init).catch(error => error)

  return response
}


/**
 * Returns initial content for the "Explore" tab in Study Overview
 *
 * @param {String} studyAccession Study accession
*/
export async function fetchExplore(studyAccession, mock=false) {
  const apiUrl = `/studies/${studyAccession}/explore`
  const [exploreInit] =
    await scpApi(apiUrl, defaultInit(), mock, false)

  return exploreInit
}

/**
* Returns bam file information for the study, suitable for passing to IGV
*
* @param {String} studyAccession Study accession
*/
export async function fetchBamFileInfo(studyAccession, mock=false) {
  const apiUrl = `/studies/${studyAccession}/explore/bam_file_info`
  const [exploreInit] =
    await scpApi(apiUrl, defaultInit(), mock, false)
  return exploreInit
}

/**
 * Get all study-wide and cluster annotations for a study
 *
 * See definition: app/controllers/api/v1/visualization/explore_controller.rb
 *
 * @param {String} studyAccession Study accession
 * @param {Boolean} mock
 */
export async function fetchClusterOptions(studyAccession, mock=false) {
  const apiUrl = `/studies/${studyAccession}/explore/cluster_options`
  const [values] = await scpApi(apiUrl, defaultInit(), mock, false)
  return values
}


/**
 * Returns an object with scatter plot data for a cluster in a study
 *
 * See definition: app/controllers/api/v1/visualization/clusters_controller.rb
 *
 * @param {String} studyAccession Study accession
 * @param {String} cluster Name of cluster, as defined at upload
 * @param {String} annotation Full annotation name,
     e.g. "CLUSTER--group--study", or object with name,type, and scope properties
 * @param {String} subsample Subsampling threshold, e.g. 10000
 * @param {String} consensus Statistic to use for consensus, e.g. "mean"
 * @param {Boolean} isAnnotatedScatter If showing "Annotated scatter" plot.
 *                  Only applies for numeric (not group) annotations.
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 *
 * Example:
 * https://localhost:3000/single_cell/api/v1/studies/SCP56/clusters/
 *   Coordinates_Major_cell_types.txt?annotation_name=CLUSTER&annotation_type=group&annotation_scope=study
 *
 * If changing URL query string parameters here, then also change them for
 * `full_params` and `default_params` in `cluster_cache_service.rb`.
 */
export async function fetchCluster({
  studyAccession, cluster, annotation, subsample, consensus, genes=null,
  isAnnotatedScatter=null, isCorrelatedScatter=null, fields=[], mock=false
}) {
  const apiUrl = fetchClusterUrl({
    studyAccession, cluster, annotation, subsample,
    consensus, genes, isAnnotatedScatter, isCorrelatedScatter, fields
  })
  // don't camelcase the keys since those can be cluster names,
  // so send false for the 4th argument
  const [scatter, perfTimes] = await scpApi(apiUrl, defaultInit(), mock, false)

  return [scatter, perfTimes]
}

/** Helper function for returning a url for fetching cluster data.  See fetchCluster above for documentation */
export function fetchClusterUrl({
  studyAccession, cluster, annotation, subsample, consensus, genes=null,
  isAnnotatedScatter=null, isCorrelatedScatter=null, fields=[]
}) {
  // Digest full annotation name to enable easy validation in API
  let [annotName, annotType, annotScope] = [annotation.name, annotation.type, annotation.scope]
  if (annotName == undefined && annotation.length) {
    [annotName, annotType, annotScope] = annotation.split('--')
  }
  if (Array.isArray(genes)) {
    genes = genes.join(',')
  }
  // eslint-disable-next-line camelcase
  const is_annotated_scatter = isAnnotatedScatter ? true : ''
  // eslint-disable-next-line camelcase
  const is_correlated_scatter = isCorrelatedScatter ? true : ''
  const paramObj = {
    annotation_name: annotName,
    annotation_type: annotType,
    annotation_scope: annotScope,
    subsample,
    consensus,
    gene: genes,
    fields: fields.join(','),
    is_annotated_scatter,
    is_correlated_scatter
  }
  const params = stringifyQuery(paramObj)
  if (!cluster || cluster === '') {
    cluster = '_default'
  }
  return `/studies/${studyAccession}/clusters/${encodeURIComponent(cluster)}${params}`
}

/**
 * Returns an object with violin plot expression data for a gene in a study
 *
 * See definition: app/controllers/api/v1/visualization/expression_controller.rb
 *
 * @param {String} studyAccession Study accession
 * @param {(String|String[])} genes Gene name or array of gene names
 * @param {String} clusterName Name of cluster
 * @param {String} annotationName Name of annotation
 * @param {String} annotationType Type of annotation ("group" or "numeric")
 * @param {String} annotationName Scope of annotation ("study" or "cluster")
 * @param {String} subsample Subsampling threshold
 * @param {String} consensus method for multi-gene renders ('mean' or 'median')
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 *
 */
export async function fetchExpressionViolin(
  studyAccession,
  genes,
  clusterName,
  annotationName,
  annotationType,
  annotationScope,
  subsample,
  consensus,
  mock=false
) {
  let geneString = genes
  if (Array.isArray(genes)) {
    geneString = genes.join(',')
  }
  const paramObj = {
    cluster: clusterName,
    annotation_name: annotationName,
    annotation_type: annotationType,
    annotation_scope: annotationScope,
    subsample,
    consensus,
    genes: geneString
  }
  const apiUrl = `/studies/${studyAccession}/expression/violin${stringifyQuery(paramObj)}`
  // don't camelcase the keys since those can be cluster names,
  // so send false for the 4th argument
  const [violin, perfTimes] = await scpApi(apiUrl, defaultInit(), mock, false)

  return [violin, perfTimes]
}

/** Get URL for a Morpheus-suitable annotation values file */
export function getAnnotationCellValuesURL(
  {
    studyAccession, cluster, annotationName, annotationScope, annotationType, mock=false
  }
) {
  const paramObj = {
    cluster,
    annotation_scope: annotationScope,
    annotation_type: annotationType
  }
  annotationName = annotationName ? annotationName : '_default'
  let apiUrl = `/studies/${studyAccession}/annotations/${encodeURIComponent(annotationName)}`
  apiUrl += `/cell_values${stringifyQuery(paramObj)}`
  return getFullUrl(apiUrl)
}

/** get URL for Morpheus-suitable annotation values file for a gene list */
export function getGeneListColsURL({ studyAccession, geneList }) {
  const apiUrl = `/studies/${studyAccession}/annotations/gene_lists/${encodeURIComponent(geneList)}`
  return getFullUrl(apiUrl)
}

/**
 * Returns an URL for fetching heatmap expression data for genes in a study
 *
 * A URL generator rather than a fetch function is provided as Morpheus needs a URL string
 *
 * @param {String} studyAccession study accession
 * @param {String} geneList: name of gene list to load (overrides cluster/annotation/subsample values)
 * @param {Array} genes List of gene names to get expression data for
 *
 */
export function getExpressionHeatmapURL({
  studyAccession, genes, cluster,
  annotation, subsample, heatmapRowCentering, geneList
}) {
  const paramObj = {
    cluster,
    annotation,
    subsample,
    genes: geneArrayToParam(genes),
    row_centered: heatmapRowCentering,
    gene_list: geneList
  }
  const path = `/studies/${studyAccession}/expression/heatmap${stringifyQuery(paramObj)}`
  return getFullUrl(path)
}

/** update a current user (such as setting their feature flags) */
export async function updateCurrentUser(updatedUser, mock=false) {
  const init = Object.assign({}, defaultInit(), {
    method: 'PATCH',
    body: JSON.stringify(updatedUser)
  })
  await scpApi('/current_user', init, mock, true)
}

/**
 * Returns a list of matching filters for a given facet
 *
 * Docs: https:///singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/Search/search_facet_filters_path
 *
 * @param {String} facet Identifier of facet
 * @param {String} query User-supplied query string
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 * @returns {Promise} Promise object containing camel-cased data from API
 *
 * @example
 *
 * // returns Promise for mock JSON
 * // in /mock_data/facet_filters_disease_tuberculosis.json
 * fetchFacetFilters('disease', 'tuberculosis', true);
 *
 * // returns Promise for live JSON as shown example from
 * // "Docs" link above (but camel-cased)
 * fetchFacetFilters('disease', 'tuberculosis');
 */
export async function fetchFacetFilters(facet, query, mock=false) {
  let queryString = `?facet=${facet}&query=${query}`
  if (mock || globalMock) {
    queryString = `_${facet}_${query}`
  }

  const pathAndQueryString = `/search/facet_filters${queryString}`

  const [filters] = await scpApi(pathAndQueryString, defaultInit(), mock)
  mapFiltersForLogging(filters)

  return filters
}

/**
 *  Queries the bulk_download/summary API to retrieve a list of study and file information
 *
 * Docs:
 * https://singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/BulkDownload/bulk_download_summary_path
 *
 * @param {Array} accessions List of study accessions to preview download
 */
export async function fetchDownloadInfo(accessions, mock=false) {
  const queryString = `?accessions=${accessions}`
  const pathAndQueryString = `/bulk_download/summary/${queryString}`
  const [info] = await scpApi(pathAndQueryString, defaultInit(), mock)
  return info
}

/**
 *  Queries the bulk_download/summary API to retrieve a list of study and file information
 *
 * Docs:
 * https://singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/BulkDownload/bulk_download_summary_path
 *
 * @param {Array} accessions List of study accessions to preview download
 */
export async function fetchDrsInfo(drsIds, mock=false) {
  const init = defaultPostInit(mock)
  init.body = JSON.stringify({ drs_ids: drsIds })
  const [info] = await scpApi(`/bulk_download/drs_info/`, init, mock)
  return info
}

/**
 * Returns a list of matching studies given a keyword and facets
 *
 * Docs: https:///singlecell.broadinstitute.org/single_cell/api/swagger_docs/v1#!/Search/search
 *
 * @param {String} type Type of query to perform ("study" or "gene")
 * @param {Object} searchParams  Search parameters, including
 *   @param {String} terms Searched keywords
 *   @param {Object} facets Applied facets and filters
 *   @param {Integer} page Page in search results
 *   @param {String} order Results ordering field
 *   @param {String} preset_search Query preset (e.g. "covid19")
 * @param {Boolean} mock If using mock data
 * @returns {Promise} Promise object containing camel-cased data from API
 */
export async function fetchSearch(type, searchParams, mock=false) {
  const path = `/search?${buildSearchQueryString(type, searchParams)}`

  const [searchResults, perfTimes] = await scpApi(path, defaultInit(), mock)

  logSearch(type, searchParams, perfTimes)

  return searchResults
}

/**
  * Constructs query string used for /search REST API endpoint
  * auto-appends the branding group if one exists
  */
export function buildSearchQueryString(type, searchParams) {
  const facetsParam = buildFacetQueryString(searchParams.facets)

  const params = ['page', 'order', 'terms', 'preset', 'genes', 'genePage']
  let otherParamString = params.map(param => {
    return searchParams[param] ? `&${param}=${searchParams[param]}` : ''
  }).join('')
  otherParamString = otherParamString.replace('preset=', 'preset_search=')

  let brandingGroupParam = ''
  const brandingGroup = getBrandingGroup()
  if (brandingGroup) {
    brandingGroupParam = `&scpbr=${brandingGroup}`
  }

  return `type=${type}${otherParamString}${facetsParam}${brandingGroupParam}`
}

/** Serializes "facets" URL parameter for /search API endpoint */
function buildFacetQueryString(facets) {
  if (!facets || !Object.keys(facets).length) {
    return ''
  }
  const rawURL = _compact(Object.keys(facets).map(facetId => {
    if (facets[facetId].length) {
      return `${facetId}:${facets[facetId].join(',')}`
    }
  })).join('+')
  // encodeURIComponent needed for the + , : characters
  return `&facets=${encodeURIComponent(rawURL)}`
}

/** Deserializes "facets" URL parameter into facets object */
export function buildFacetsFromQueryString(facetsParamString) {
  const facets = {}
  if (facetsParamString) {
    facetsParamString.split('+').forEach(facetString => {
      const facetArray = facetString.split(':')
      facets[facetArray[0]] = facetArray[1].split(',')
    })
  }
  return facets
}

/** returns the current branding group as specified by the url  */
export function getBrandingGroup() {
  const queryParams = queryString.parse(window.location.search)
  return queryParams.scpbr
}

/** Get full URL for a given including any extension (or a mocked URL) */
export function getFullUrl(path, mock=false) {
  if (globalMock) {
    mock = true
  }
  const basePath = (mock || globalMock) ? `${mockOrigin}/mock_data` : defaultBasePath
  let fullPath = basePath + path
  if (mock) {
    fullPath += '.json' // e.g. /mock_data/search/auth_code.json
  } else {
    fullPath = `${location.origin}${fullPath}`
  }
  return fullPath
}

/**
 * Client for SCP REST API.  Less fetch boilerplate, easier mocks.
 *
 * @param {String} path Relative path for API endpoint, e.g. /search/auth_code
 * @param {Object} init Object for settings, just like standard fetch `init`
 * @param {Boolean} mock If using mock data.  Helps development, tests.
 */
export default async function scpApi(
  path, init, mock=false, camelCase=true, toJson=true
) {
  const url = getFullUrl(path, mock)

  const perfTimeStart = performance.now()

  const response = await fetch(url, init).catch(error => error)

  // Milliseconds taken to fetch data from API
  // Suboptimal, but retained until at least Q4 2021 for continuity.
  // Use `perfTime:full` for closest measure of user-perceived duration.
  const legacyBackendTime = performance.now() - perfTimeStart

  const perfTimes = {
    url,
    legacyBackend: legacyBackendTime
  }

  if (response.ok) {
    if (toJson && response.status !== 204) {
      const jsonPerfTimeStart = performance.now()
      const json = await response.json()
      perfTimes.parse = performance.now() - jsonPerfTimeStart
      // Converts API's snake_case to JS-preferrable camelCase,
      // for easy destructuring assignment.
      if (camelCase) {
        return [camelcaseKeys(json), perfTimes, true]
      } else {
        return [json, perfTimes, true]
      }
    } else {
      return [response, perfTimes, true]
    }
  } else {
    if (response.status === 401 || response.status === 403) {
      showMessage(
        <div>
          Authentication failed<br/>
          Your session may have timed out. Please sign in again.<br/><br/>
        </div>,
        'api-auth-failure',
        {
          source: 'api',
          url,
          isError: true,
          messageType: 'error-client',
          statusCode: response.status
        }
      )
    }
  }
  if (toJson) {
    const json = await response.json()
    throw new Error(json.error || json.errors)
  }
  throw new Error(response)
}

/**
  * similar functionality to scpApi, but uses XMLHttpRequest to enable support for progress events.
  * fetch does not yet support them.
  * See https://stackoverflow.com/questions/35711724/upload-progress-indicators-for-fetch
  */
async function scpApiXmlHttp({ apiUrl, init, formData, onProgress }) {
  const url = getFullUrl(apiUrl, false)
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open(init.method, url)
    Object.keys(init.headers).forEach(key => {
      request.setRequestHeader(key, init.headers[key])
    })
    if (onProgress) {
      request.upload.addEventListener('progress', onProgress)
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        let response = {}
        if (request.status != 204) {
          response = JSON.parse(request.response)
        }
        resolve(response)
      } else {
        reject(JSON.parse(request.response).error)
      }
    }
    request.onerror = () => {
      reject(request.statusText)
    }
    request.send(formData)
  })
}
