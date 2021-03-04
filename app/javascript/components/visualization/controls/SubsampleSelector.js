import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'lib/cluster-utils'


/** takes the server response and returns subsample options suitable for react-select */
function getSubsampleOptions(annotationList, clusterName) {
  let subsampleOptions = [{ label: 'All Cells', value: '' }]
  if (clusterName && annotationList.subsample_thresholds) {
    let clusterSubsamples = annotationList.subsample_thresholds[clusterName]
    if (!clusterSubsamples) {
      clusterSubsamples = []
    }
    subsampleOptions = subsampleOptions.concat(clusterSubsamples.map(num => {
      return { label: `${num}`, value: num }
    }))
  }
  return subsampleOptions
}


/**
  Renders a subsample selector.
    @param annotationList: the results of a call to scpApi/fetchClusterOptions (or equivalent).
    @param cluster: the name of the cluster selected
    @param subsample: the current subsample selected
    @param updateClusterParams: update function that accepts changes to cluster, annotation, and/or subsample properties
  */
export default function SubsampleSelector({
  annotationList,
  cluster,
  subsample,
  updateClusterParams
}) {
  if (!annotationList) {
    annotationList = { default_cluster: null, default_annotation: null, annotations: [] }
  }

  const subsampleOptions = getSubsampleOptions(annotationList, cluster)

  return (
    <div className="form-group">
      <label>Subsampling</label>
      <Select options={subsampleOptions}
        value={{
          label: subsample == '' ? 'All Cells' : subsample,
          value: subsample
        }}
        onChange={newSubsample => updateClusterParams({
          subsample: newSubsample.value
        })}
        styles={clusterSelectStyle}/>
    </div>
  )
}
