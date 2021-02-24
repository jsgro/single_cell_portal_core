import React from 'react'
import _clone from 'lodash/clone'
import Select from 'react-select'

import { annotationKeyProperties, getMatchedAnnotation, clusterSelectStyle } from 'lib/cluster-utils'

/** takes the server response and returns annotation options suitable for react-select */
function getAnnotationOptions(annotationList, clusterName) {
  return [{
    label: 'Study Wide',
    options: annotationList.annotations
      .filter(annot => annot.scope == 'study').map(annot => annotationKeyProperties(annot))
  }, {
    label: 'Cluster-Based',
    options: annotationList.annotations
      .filter(annot => annot.cluster_name === clusterName && annot.scope === 'cluster')
      .map(annot => annotationKeyProperties(annot))
  }, {
    label: 'User-Based',
    options: annotationList.annotations
      .filter(annot => annot.cluster_name === clusterName && annot.scope === 'user')
      .map(annot => annotationKeyProperties(annot))
  }]
}


/** renders cluster, annotation, and (optionally) subsample and consensus controls for a study
    by default, this control will handle fetching the dropdown options from the server.
    If those options have already been fetched (or will be retrieved as part of a call already
    being made, 'fetchAnnotationList' can be set to fale, and then a preloadedAnnotationList
    can be provided

    studyAccession: the study accesion
    showConsensus: whether to show the consensus ('View as') dropdown
    showSubsample: whether to show the subsample dropdown
    preloadedAnnotationList: the results of a call to scpApi/fetchClusterOptions (or equivalent).
      Only needs to be specified if fetchAnnotionList is false
    fetchAnnotationList=true: whether this component should handle populating dropdown options
    dataParams,
    setDataParams
    )

  */
export default function ClusterControls({
  annotationList,
  dataParams,
  updateDataParams
}) {
  if (!annotationList) {
    annotationList = { default_cluster: null, default_annotation: null, annotations: [] }
  }

  const annotationOptions = getAnnotationOptions(annotationList, dataParams.cluster)

  const shownAnnotation = _clone(dataParams.annotation)
  // for user annotations, we have to match the given id to a name to show the name in the dropdown
  if (dataParams.annotation && dataParams.annotation.scope === 'user') {
    const matchedAnnotation = getMatchedAnnotation(dataParams.annotation, annotationList)
    if (matchedAnnotation) {
      shownAnnotation.name = matchedAnnotation.name
      shownAnnotation.id = matchedAnnotation.id
    }
  }

  return (
    <div className="form-group">
      <label>Annotation</label>
      <Select options={annotationOptions}
        value={shownAnnotation}
        getOptionLabel={annotation => annotation.name}
        getOptionValue={annotation => annotation.scope + annotation.name + annotation.cluster_name}
        onChange={annotation => updateDataParams({
          annotation,
          cluster: dataParams.cluster,
          subsample: dataParams.subsample,
          consensus: dataParams.consensus
        })}
        styles={clusterSelectStyle}/>
    </div>
  )
}
