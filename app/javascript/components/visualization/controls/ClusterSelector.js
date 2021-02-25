import React from 'react'
import Select from 'react-select'

import {
  getDefaultSubsampleForCluster, annotationKeyProperties,
  getDefaultAnnotationForCluster, clusterSelectStyle
} from 'lib/cluster-utils'


/** takes the server response and returns cluster options suitable for react-select */
function getClusterOptions(annotationList, spatialGroups) {
  const clusterList = annotationList.clusters ? annotationList.clusters : []
  if (spatialGroups && spatialGroups.length) {
    // return two option groups, one non-spatial and one spatial
    const spatialGroupNames = spatialGroups.map(group => group.name)
    return [{
      options: clusterList.filter(name => !spatialGroupNames.includes(name))
        .map(name => ({ label: name, value: name }))
    }, {
      label: 'Spatial',
      options: clusterList.filter(name => spatialGroupNames.includes(name))
        .map(name => ({ label: name, value: name }))
    }]
  }
  return clusterList.map(name => {return { label: name, value: name }})
}


/**
  Renders a cluster selector.  Handles automatically updating the annotation and subsample when
   the cluster is changed.
    annotationList: the results of a call to scpApi/fetchClusterOptions (or equivalent).
    dataParams: an object specifying cluster, annotation, and subsample selections
    updateDataParams: update function for dataParams
  */
export default function ClusterSelector({
  annotationList,
  spatialGroups,
  dataParams,
  updateDataParams
}) {
  if (!annotationList) {
    annotationList = { default_cluster: null, default_annotation: null, annotations: [] }
  }

  const clusterOptions = getClusterOptions(annotationList, spatialGroups)

  return (
    <div className="form-group">
      <label>Clustering</label>
      <Select options={clusterOptions}
        value={{ label: dataParams.cluster, value: dataParams.cluster }}
        onChange={cluster => updateDataParams({
          annotation: annotationKeyProperties(getDefaultAnnotationForCluster(
            annotationList,
            cluster.name,
            dataParams.annotation
          )),
          cluster: cluster.value,
          subsample: getDefaultSubsampleForCluster(annotationList, cluster.value)
        })}
        styles={clusterSelectStyle}
      />
    </div>
  )
}
