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
export default function SubsampleSelector({
  annotationList,
  dataParams,
  updateDataParams
}) {
  if (!annotationList) {
    annotationList = { default_cluster: null, default_annotation: null, annotations: [] }
  }

  const subsampleOptions = getSubsampleOptions(annotationList, dataParams.cluster)

  return (
    <div className="form-group">
      <label>Subsampling</label>
      <Select options={subsampleOptions}
        value={{
          label: dataParams.subsample == '' ? 'All Cells' : dataParams.subsample,
          value: dataParams.subsample
        }}
        onChange={subsample => updateDataParams({
          annotation: dataParams.annotation,
          cluster: dataParams.cluster,
          subsample: subsample.value,
          consensus: dataParams.consensus
        })}
        styles={clusterSelectStyle}/>
    </div>
  )
}
