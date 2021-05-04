
/** return a string key unique to the study and cluster */
function getKey(accession, cluster) {
  return `${accession}-${cluster}`
}

/** return a cache object suitable for optimizing coordinate and expression data fetching
 * cache.getFieldsToRequest can be used to construct optimized API requests, and then
 * applyCache can be used to merge/cache the received responses
 */
export function newCache() {
  const cache = {
    entries: {}
  }

  /** adds the data for a given study/cluster, overwriting any previous entry */
  cache.addScatterData = (accession, cluster, scatterData) => {
    const key = getKey(accession, cluster)
    cache.entries[key] = scatterData
  }

  /** get the data for a given study/cluster */
  cache.getScatterData = (accession, clusterName) => {
    const key = getKey(accession, clusterName)
    return cache.entries[key]
  }

  /** returns a boolean whether there is already coordinate data cached for the given study/cluster */
  cache.hasScatterData = (accession, clusterName) => {
    const key = getKey(accession, clusterName)
    return key in cache.entries
  }

  /** based on cache contents and desired return values, returns a string suitable for the
    * 'fields' parameter of api/v1/visualization/clusters */
  cache.getFieldsToRequest = (studyAccession, clusterName, genes, isAnnotatedScatter) => {
    let fields = null
    // we don't cache anything for annotated scatter since the coordinates are different per annotation/gene
    if (!isAnnotatedScatter && cache.hasScatterData(studyAccession, clusterName)) {
      if (genes.length) {
        fields = 'expression'
      } else {
        fields = 'annotation'
      }
    }
    return fields
  }

  /** apply the current contents of the cache to the given response object from api/v1/visualization/clusters
    * this will not overwrite any existing fields in the response object
    * If there is no existing cache object for the accession/cluster, it will add it to the cache
    */
  cache.applyCache = (studyAccession, response) => {
    // use the cluster name from the response, since the requested cluster name might just be nil or '_default'
    const clusterName = response.cluster
    if (cache.hasScatterData(studyAccession, clusterName)) {
      const cachedData = cache.getScatterData(studyAccession, clusterName)
      // don't try to cache annotations just yet, since that's more complicated
      const mergeKeys = ['x', 'y', 'z', 'cells']
      mergeKeys.forEach(key => {
        if (!response.data[key] && cachedData[key]) {
          response.data[key] = cachedData[key]
        }
      })
    } else {
      // if this isn't an annotated scatter, and it came with x coordinate data, cache it
      if (!response.isAnnotatedScatter && response.data['x']) {
        cache.addScatterData(studyAccession, clusterName, response.data)
      }
    }
  }
  return cache
}
