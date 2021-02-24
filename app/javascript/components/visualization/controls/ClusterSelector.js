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
          subsample: getDefaultSubsampleForCluster(annotationList, cluster.value),
          consensus: dataParams.consensus
        })}
        styles={clusterSelectStyle}
      />
    </div>
  )
}
