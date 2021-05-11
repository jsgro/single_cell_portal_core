import { fetchCluster } from 'lib/scp-api'


/** return a string key unique to the study, cluster, and subsample */
function getKey(accession, cluster, subsample) {
  return `${accession}-${cluster}-${subsample}`
}

function getAnnotationKey(annotationName, annotationScope) {
  return `${annotationName}-${annotationScope}`
}

function getExpressionKey(gene, consensus) {
  return `${gene}-${consensus}`
}

const FIELDS = {
  cellsAndCoords: {
    getFromEntry: entry => entry.cellsAndCoords,
    putInEntry: (entry, cellsAndCoords) => entry.cellsAndCoords = cellsAndCoords,
    merge: (entry, scatter) => {
      const clusterFields = ['x', 'y', 'z', 'cells']
      clusterFields.forEach(field => {
        entry.cellsAndCoords[field] = scatter.data[field] ? scatter.data[field] : entry.cellsAndCoords[field]
        scatter.data[field] = entry.cellsAndCoords[field]
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
    merge: (entry, scatter) => {
      if (scatter.data.expression) {
        FIELDS.expression.putInEntry(entry, scatter.genes, scatter.consensus, scatter.data.expression)
      } else {
        scatter.data.expression = FIELDS.expression.getFromEntry(entry, scatter.genes, scatter.consensus)
      }
    }
  },
  clusterProps: {
    getFromEntry: entry => entry.clusterProps,
    putInEntry: (entry, clusterProps) => entry.clusterProps = clusterProps,
    merge: (entry, scatter) => {
      const { data, ...clusterProps } = scatter
      Object.assign(entry.clusterProps, clusterProps)
      Object.assign(scatter, entry.clusterProps)
      return clusterProps
    }
  }
}

/** return a cache object suitable for optimizing coordinate and expression data fetching
 * cache.getFieldsToRequest can be used to construct optimized API requests, and then
 * applyCache can be used to merge/cache the received responses
 */
export function newCache() {
  const cache = {
    entries: {},
    entryOrder: [],
    // we put the fetch cluster method here for ease of mocking in test cases
    apiFetchCluster: fetchCluster
  }


  /** adds the data for a given study/clusterName, overwriting any previous entry */
  cache._mergeClusterResponse = (accession, clusterResponse, requestedCluster, requestedAnnotation, requestedSubsample) => {
    const scatter = clusterResponse[0]
    const cacheEntry = cache._findOrCreateEntry(accession, scatter.cluster, scatter.subsample)

    if (scatter.cluster != requestedCluster || requestedSubsample !== scatter.subsample) {
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
      // we only cache one cluster/subsample at a time, so delete any others
      cache.entries = {}
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
      const cachedCellsAndCoords = FIELDS.cellsAndCoords.getFromEntry(cacheEntry)
      if (!cachedCellsAndCoords.x) {
        fields.push('coordinates')
        fields.push('cells')
      } else if (cachedCellsAndCoords.then) {
        promises.push(cachedCellsAndCoords)
      }
      const cachedAnnotation = FIELDS.annotation.getFromEntry(cacheEntry, annotation.name, annotation.scope)
      if (!cachedAnnotation) {
        fields.push('annotation')
      } else if (cachedAnnotation.then && !promises.includes(cachedAnnotation)) {
        promises.push(cachedAnnotation)
      }
      if (genes.length) {
        const cachedExpression = FIELDS.expression.getFromEntry(cacheEntry, genes, consensus)
        if (!cachedExpression) {
          fields.push('expression')
        } else if (cachedExpression.then && !promises.includes(cachedExpression)) {
          promises.push(cachedExpression)
        }
      }
    } else {
      fields.push('coordinates')
    }
    return { fields, promises }
  }

  cache.clearOld = ({cluster, annotation, subsample, consensus, genes, isAnnotatedScatter}) => {

  }

  /** fetch the given cluster data, either form cache or the server, as appropriate
    * see fetchCluster in scp-api for parameter documentation
    * returns a promise */
  cache.fetchCluster = ({
    studyAccession, cluster, annotation, subsample, consensus, genes=[], isAnnotatedScatter=false
  }) => {
    cache.clearOld(cluster, annotation, subsample, consensus, genes, isAnnotatedScatter)
    let apiCallPromise = null
    const { fields, promises } = cache._getFieldsToRequest({
      studyAccession, cluster, annotation, subsample, consensus, genes, isAnnotatedScatter
    })
    if (fields.length) {
      apiCallPromise = cache.apiFetchCluster({
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
          isPureCache: true
        }, -1
      ])
    }
    promises.push(apiCallPromise)

    return Promise.all(promises).then(resultArray => {
      let mergedResult = null
      resultArray.forEach(result => {
        mergedResult = cache._mergeClusterResponse(studyAccession, result, cluster, annotation, subsample)
      })
      return mergedResult
    })
  }

  return cache
}
