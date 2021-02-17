/** Utility functions for parsing cluster and annotation parameters from the server
 *  These live in a separate utility because multiple endpoints (explore, cluster, etc..)
 *  return annotationLists of the same basic structure */


/** takes the server response and returns subsample default subsample for the cluster */
export function getDefaultSubsampleForCluster(annotationList, clusterName) {
  return '' // for now, default is always all cells
}


/** takes a full annotation object, which may have values and other properties, and just extracts the
  * key parameters for url state */
export function annotationKeyProperties(annotation) {
  return {
    name: annotation.name,
    type: annotation.type,
    scope: annotation.scope,
    id: annotation.id
  }
}

/** transmutes an annotation into a string identifier of form {name}--{type}--{scope} */
export function getIdentifierForAnnotation(annotation) {
  if (!annotation) {
    return '----'
  }
  return `${annotation.id ? annotation.id : annotation.name}--${annotation.type}--${annotation.scope}`
}


/** extracts default parameters from an annotationList of the type returned by the explore API */
export function getDefaultClusterParams(annotationList) {
  return {
    cluster: annotationList.default_cluster,
    annotation: annotationKeyProperties(annotationList.default_annotation),
    subsample: getDefaultSubsampleForCluster(annotationList, annotationList.default_cluster)
  }
}

/** returns the first annotation for the given cluster */
export function getDefaultAnnotationForCluster(annotationList, clusterName, currentAnnotation) {
  if (currentAnnotation && currentAnnotation.scope === 'study') {
    // if they are changing cluster, and using a study-wide annotation, keep that annotation selected
    return currentAnnotation
  }
  const clusterAnnots = annotationList.annotations.filter(annot => annot.cluster_name === clusterName &&
                                                                   annot.scope === 'cluster')
  if (clusterAnnots.length) {
    return clusterAnnots[0]
  } else {
    return annotationList.annotations[0]
  }
}

/** finds the corresponding entry in annotationList for the given annotation,
 * and returns the unique values for the anotations
 */
export function getAnnotationValues(annotation, annotationList) {
  const matchedAnnotation = getMatchedAnnotation(annotation, annotationList)
  if (matchedAnnotation) {
    return matchedAnnotation.values
  }
  return []
}

/** finds the matching entry in the all annotation list for the specified annotation */
export function getMatchedAnnotation(annotation, annotationList) {
  if (annotationList && annotationList.annotations) {
    const matchedAnnotation = annotationList.annotations.find(a => {
      return (a.name === annotation.name || a.id === annotation.name) &&
             a.type === annotation.type &&
             a.scope === annotation.scope
    })
    return matchedAnnotation
  }
  return undefined
}
