
/** return a string key unique to the study and cluster */
function getKey(accession, cluster) {
  return `${accession}-${cluster}`
}

/** return a cache object
 *  it supports adding and retrieving past calls to cluster API endpoints
    via addScatterDataToCache() and getScatterData()
  */
export function newCache() {
  const cache = {
    entries: {}
  }

  cache.addScatterData = (accession, cluster, scatterData) => {
    const key = getKey(accession, cluster)
    cache.entries[key] = scatterData
  }

  cache.getScatterData = (accession, clusterName) => {
    const key = getKey(accession, clusterName)
    return cache.entries[key]
  }

  cache.hasScatterData = (accession, clusterName) => {
    const key = getKey(accession, clusterName)
    return key in cache.entries
  }

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

  cache.applyCache = (studyAccession, response) => {
    // use the cluster name from the response, since the requested cluster name might just be nil or '_default'
    const clusterName = response.cluster
    if (cache.hasScatterData(studyAccession, clusterName)) {
      const cachedData = cache.getScatterData(studyAccession, clusterName)
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
