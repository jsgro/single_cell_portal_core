import { fetchCluster } from 'lib/scp-api'

/**
  Provides a transparent caching mechanism for calls to fetchCluster
  For each call, it attempts to caches three separate things from the response:
    cellsAndCoords: the coordinates and cell names of the cluster
    annotations: an array of annotations
    expression: an array of expression values
  Prior to a new call, it checks the cache if any of those are available for the
  given params.  If so, it removes those fields from the list of fields to request from the server
  Once the response from the server comes back, it handles merging in all the cached fields into the
  response.

  For performance reasons, this always copies by referene -- (e.g. it never clones an array of coords)
  This means, for example, that multiple plotly graphs will actually share underlying data structures.
  As far as I can tell, this is a good thing.  But this means extreme caution should be
  taken before modifying anything returned from a cache call, since it may be used
  in multiple places.

  Also for performance and debuggability, this stores at most one gene and one annotation
  and one set of expression values for a given cluster. These is no limit to the number
  of clusters this will cache, so it is up to the caller to call cache.clear().
  (note that because spatial data displays involve fetching multiple clusters on the
  same page view, it would be non-trivial for this cache to self-detect when a given
  cluster is fit to be removed from the cache)

  SIMPLE USAGE:

  const cache = newCache()

  cache.fetchCluster({params})

  cache.fetchCluster({same params})  // will not have to go the server

  cache.fetchCluster({same params, but differen annotation}) // will only fetch the annotation values
   // does not refetch the cells/coords

*/


/**
  The FIELDS object is a collection of static helper method, grouped by the field they help cache.

   For each separate field that we cache, we define a property on FIELDS, with
   get, put, and merge methods. Get and put are simple hash operations.
   Merge takes a server response object, and put the relevant fields into the cache,
   or update the response object with fields from the cache if they were not on the response object
   already
   */
const FIELDS = {
  cellsAndCoords: {
    getFromEntry: entry => entry.cellsAndCoords,
    putInEntry: (entry, cellsAndCoords) => entry.cellsAndCoords = cellsAndCoords,
    addFieldsOrPromise: (entry, fields, promises) => {
      const cachedCellsAndCoords = FIELDS.cellsAndCoords.getFromEntry(entry)
      if (cachedCellsAndCoords.then) {
        promises.push(cachedCellsAndCoords)
      } else if (!cachedCellsAndCoords.x) {
        fields.push('coordinates')
        fields.push('cells')
      }
    },
    merge: (entry, scatter) => {
      const clusterFields = ['x', 'y', 'z', 'cells']
      clusterFields.forEach(field => {
        if (scatter.data[field]) {
          entry.cellsAndCoords[field] = scatter.data[field]
        }
        if (entry.cellsAndCoords[field]) {
          scatter.data[field] = entry.cellsAndCoords[field]
        }
      })
    }
  },

  annotation: {
    getFromEntry: (entry, annotationName, annotationScope) => {
      const key = getAnnotationKey(annotationName, annotationScope)
      return entry.annotations[key]
    },
    putInEntry: (entry, annotationName, annotationScope, annotations) => {
      const key = getAnnotationKey(annotationName, annotationScope)
      // we only cache one annotation at a time, so for now, delete any others
      entry.annotations = {}
      entry.annotations[key] = annotations
    },
    addFieldsOrPromise: (entry, fields, promises, annotationName, annotationScope) => {
      const cachedAnnotation = FIELDS.annotation.getFromEntry(entry, annotationName, annotationScope)
      if (!cachedAnnotation) {
        fields.push('annotation')
      } else if (cachedAnnotation.then && !promises.includes(cachedAnnotation)) {
        promises.push(cachedAnnotation)
      }
    },
    merge: (entry, scatter) => {
      if (scatter.data.annotations) {
        FIELDS.annotation.putInEntry(entry, scatter.annotParams.name, scatter.annotParams.scope, scatter.data.annotations)
      } else {
        scatter.data.annotations = FIELDS.annotation.getFromEntry(entry, scatter.annotParams.name, scatter.annotParams.scope)
      }
    }
  },

  expression: {
    getFromEntry: (entry, genes, consensus) => {
      const key = getExpressionKey(genes, consensus)
      return entry.expression[key]
    },
    putInEntry: (entry, genes, consensus, expression) => {
      const key = getExpressionKey(genes, consensus)
       // we only cache one set of expression data at a time, so for now, delete any others
      entry.expression = {}
      entry.expression[key] = expression
    },
    addFieldsOrPromise: (entry, fields, promises, genes, consensus) => {
      const cachedExpression = FIELDS.expression.getFromEntry(entry, genes, consensus)
      if (!cachedExpression) {
        fields.push('expression')
      } else if (cachedExpression.then && !promises.includes(cachedExpression)) {
        promises.push(cachedExpression)
      }
    },
    merge: (entry, scatter) => {
      if (scatter.data.expression) {
        FIELDS.expression.putInEntry(entry, scatter.genes, scatter.consensus, scatter.data.expression)
      } else {
        scatter.data.expression = FIELDS.expression.getFromEntry(entry, scatter.genes, scatter.consensus)
      }
    }
  },

  /** We have to also manage a fourth 'field' called clusterProps.  This stores
   all the other stuff on the response (axes, point size, etc...).  We mainly
   need this in the event we realize we can serve a response entirely with data from
   the cache.  This then allows us to reconstruct a full response */
  clusterProps: {
    getFromEntry: entry => entry.clusterProps,
    putInEntry: (entry, clusterProps) => entry.clusterProps = clusterProps,
    merge: (entry, scatter) => {
      // clusterProps caches everything except the data and isPureCache properties
      const { data, isPureCache, ...clusterProps } = scatter
      Object.assign(entry.clusterProps, clusterProps)
      Object.assign(scatter, entry.clusterProps)
      return clusterProps
    }
  }
}

/**
 * Get a fresh, empty cache.
 */
export function newCache() {
  const cache = {
    entries: {}
  }

  /** fetch the given cluster data, either form cache or the server, as appropriate
  * see fetchCluster in scp-api for parameter documentation
  * returns a promise */
  cache.fetchCluster = ({
    studyAccession, cluster, annotation, subsample, consensus, genes=[], isAnnotatedScatter=false
  }) => {
    let apiCallPromise = null
    const { fields, promises } = cache._getFieldsToRequest({
      studyAccession, cluster, annotation, subsample, consensus, genes, isAnnotatedScatter
    })

    if (fields.length) {
      apiCallPromise = fetchCluster({
        studyAccession, cluster, annotation, subsample, consensus, genes, isAnnotatedScatter, fields
      })
      const cacheEntry = cache._findOrCreateEntry(studyAccession, cluster, subsample)
      if (fields.includes('coordinates')) {
        FIELDS.cellsAndCoords.putInEntry(cacheEntry, apiCallPromise)
      }
      if (fields.includes('annotation')) {
        FIELDS.annotation.putInEntry(cacheEntry, annotation.name, annotation.scope, apiCallPromise)
      }
      if (fields.includes('expression')) {
        FIELDS.expression.putInEntry(cacheEntry, genes, consensus, apiCallPromise)
      }
    } else {
      apiCallPromise = Promise.resolve([
        {
          genes,
          consensus,
          cluster,
          subsample,
          annotParams: annotation,
          data: {},
          isPureCache: true // set a flag indicating that no fresh request to the server was needed
        }, {
          url: 'cache',
          legacyBackend: 0, // a backend time of zero since this request will never go to the server
          parse: 0
        }
      ])
    }
    promises.push(apiCallPromise)

    return Promise.all(promises).then(resultArray => {
      let mergedResult = null
      resultArray.forEach(result => {
        mergedResult = cache._mergeClusterResponse(studyAccession, result, cluster, subsample)
      })
      return mergedResult
    })
  }

  /** Wipes the entire cache */
  cache.clear = () => {
    cache.entries = {}
  }


  /** adds the data for a given study/clusterName, overwriting any previous entry */
  cache._mergeClusterResponse = (accession, clusterResponse, requestedCluster, requestedSubsample) => {
    const scatter = clusterResponse[0]
    const cacheEntry = cache._findOrCreateEntry(accession, scatter.cluster, scatter.subsample)

    if (scatter.cluster != requestedCluster || requestedSubsample !== scatter.subsample) {
      // if the returned cluster name is different (likely because we requested '_default' and then
      // got back the actual cluster name), also cache the response under the name of the requested name
      cache._putEntry(accession, requestedCluster, requestedSubsample, cacheEntry)
    }
    if (scatter.isPureCache) {
      // we need the response cluster/subsample to mimic what actually came from the server for the graphs
      // to render correctly
      scatter.annotParams = cacheEntry.clusterProps.annotParams
      scatter.cluster = cacheEntry.clusterProps.cluster
      scatter.subsample = cacheEntry.clusterProps.subsample
    }
    FIELDS.clusterProps.merge(cacheEntry, scatter)
    FIELDS.cellsAndCoords.merge(cacheEntry, scatter)
    FIELDS.annotation.merge(cacheEntry, scatter)
    if (scatter.genes.length) {
      FIELDS.expression.merge(cacheEntry, scatter)
    }
    return clusterResponse
  }

  /** get the data for a given study/cluster.  Returns a blank entry if none exists */
  cache._findOrCreateEntry = (accession, clusterName, subsample) => {
    const key = getKey(accession, clusterName, subsample)

    if (!cache.entries[key]) {
      cache.entries[key] = {
        clusterProps: {},
        cellsAndCoords: {},
        annotations: {},
        expression: {}
      }
    }
    return cache.entries[key]
  }

  /** get the data for a given study/cluster */
  cache._putEntry = (accession, clusterName, subsample, entry) => {
    const key = getKey(accession, clusterName, subsample)
    cache.entries[key] = entry
  }

  /** based on cache contents and desired return values, returns an array suitable for the 'fields' argument
    * to fetchCluster in scp-api, and an array of promises for any in-flight requests relating to the needed data
     */
  cache._getFieldsToRequest = ({
    studyAccession, cluster, annotation, subsample, consensus, genes, isAnnotatedScatter
  }) => {
    const fields = []
    const promises = []
    // we don't cache anything for annotated scatter since the coordinates are different per annotation/gene
    if (!isAnnotatedScatter) {
      const cacheEntry = cache._findOrCreateEntry(studyAccession, cluster, subsample)
      FIELDS.cellsAndCoords.addFieldsOrPromise(cacheEntry, fields, promises)
      FIELDS.annotation.addFieldsOrPromise(cacheEntry, fields, promises, annotation.name, annotation.scope)
      if (genes.length) {
        FIELDS.expression.addFieldsOrPromise(cacheEntry, fields, promises, genes, consensus)
      }
    } else {
      fields.push('coordinates')
    }
    return { fields, promises }
  }

  return cache
}

/** returns a key for the cache entry of a given cluster */
function getKey(accession, cluster, subsample) {
  return `${accession}-${cluster}-${subsample}`
}

/** returns a key for the cache entry of a given annotation */
function getAnnotationKey(annotationName, annotationScope) {
  return `${annotationName}-${annotationScope}`
}

/** returns a key for the cache entry of a given gene */
function getExpressionKey(gene, consensus) {
  return `${gene}-${consensus}`
}

