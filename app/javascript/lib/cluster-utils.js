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
    scope: annotation.scope
  }
}


/** extracts default parameters from an annotationList of the type returned by the explore API */
export function getDefaultClusterParams(annotationList) {
  return {
    cluster: annotationList.default_cluster,
    annotation: annotationKeyProperties(annotationList.default_annotation),
    subsample: getDefaultSubsampleForCluster(annotationList, annotationList.default_cluster)
  }
}
