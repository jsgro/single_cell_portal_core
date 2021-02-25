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


/**
  Renders an annotation selector.  Handles automatically updating the annotation and subsample when
   the cluster is changed.
    annotationList: the results of a call to scpApi/fetchClusterOptions (or equivalent).
    dataParams: an object specifying cluster, annotation, and subsample selections
    updateDataParams: update function for dataParams
  */
export default function AnnotationControl({
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
        onChange={annotation => updateDataParams({ annotation })}
        styles={clusterSelectStyle}/>
    </div>
  )
}
