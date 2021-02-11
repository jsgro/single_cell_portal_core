import React, { useState, useEffect } from 'react'
import _find from 'lodash/find'
import Select from 'react-select'
import { Popover, OverlayTrigger } from 'react-bootstrap'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { fetchClusterOptions } from 'lib/scp-api'
import { getDefaultSubsampleForCluster, annotationKeyProperties } from 'lib/cluster-utils'

export const emptyDataParams = {
  cluster: '',
  annotation: '',
  subsample: '',
  consensus: null
}

const consensusOptions = [
  { label: 'Dot plot', value: null },
  { label: 'Violin - Mean', value: 'mean' },
  { label: 'Violin - Median', value: 'median' }
]

/** finds the corresponding entry in annotationList for the given annotation,
 * and returns the unique values for the anotations
 */
export function getAnnotationValues(annotation, allAnnotations) {
  let annotationValues = []
  if (allAnnotations && allAnnotations.annotations) {
    const matchedAnnotation = allAnnotations.annotations.find(a => {
      return a.name === annotation.name &&
             a.type === annotation.type &&
             a.scope === annotation.scope
    })
    if (matchedAnnotation) {
      annotationValues = matchedAnnotation.values
    }
  }
  return annotationValues
}

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

/** takes the server response and returns cluster options suitable for react-select */
function getClusterOptions(annotationList) {
  const clusterList = annotationList.clusters ? annotationList.clusters : []
  return clusterList.map(name => {return { label: name, value: name }})
}

/** takes the server response and returns annotation options suitable for react-select */
function getAnnotationOptions(annotationList, clusterName) {
  return [{
    label: 'Study Wide',
    options: annotationList.annotations
      .filter(annot => annot.scope == 'study').map(annot => annotationKeyProperties(annot))
  }, {
    label: 'Cluster-Based',
    options: annotationList.annotations
      .filter(annot => annot.cluster_name == clusterName).map(annot => annotationKeyProperties(annot))
  }]
}

/** returns the first annotation for the given cluster */
function getDefaultAnnotationForCluster(annotationList, clusterName, currentAnnotation) {
  if (currentAnnotation && currentAnnotation.scope === 'study') {
    // if they are changing cluster, and using a study-wide annotation, keep that annotation selected
    return currentAnnotation
  }
  const clusterAnnots = annotationList.annotations.filter(annot => annot.cluster_name == clusterName)
  if (clusterAnnots.length) {
    return clusterAnnots[0]
  } else {
    return annotationList.annotations[0]
  }
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
  studyAccession,
  showConsensus,
  showSubsample,
  preloadedAnnotationList,
  fetchAnnotationList=true,
  dataParams,
  setDataParams
}) {
  const [annotationList, setAnnotationList] =
    useState({ default_cluster: null, default_annotation: null, annotations: [] })

  const clusterOptions = getClusterOptions(annotationList)
  const annotationOptions = getAnnotationOptions(annotationList, dataParams.cluster)
  const subsampleOptions = getSubsampleOptions(annotationList, dataParams.cluster)

  // override the default of interior scrollbars on the menu
  const customSelectStyle = {
    control: provided => ({
      ...provided,
      borderColor: '#4d72aa'
    })
  }

  useEffect(() => {
    // only update if this component is responsible for loading annotation data from the server
    // or if the preloadedList has been specified already
    if (fetchAnnotationList) {
      fetchClusterOptions(studyAccession).then(newAnnotationList => setAnnotationList(newAnnotationList))
    } else if (preloadedAnnotationList) {
      setAnnotationList(preloadedAnnotationList)
    }
  }, [studyAccession, preloadedAnnotationList])

  return (
    <div className="cluster-controls">
      <div className="form-group">
        <label>Load cluster</label>
        <Select options={clusterOptions}
          value={{ label: dataParams.cluster, value: dataParams.cluster }}
          onChange={cluster => setDataParams({
            annotation: annotationKeyProperties(getDefaultAnnotationForCluster(annotationList, cluster.name, dataParams.annotation)),
            cluster: cluster.value,
            subsample: getDefaultSubsampleForCluster(annotationList, cluster.value),
            consensus: dataParams.consensus
          })}
          styles={customSelectStyle}
        />
      </div>
      <div className="form-group">
        <label>Select annotation</label>
        <Select options={annotationOptions}
          value={dataParams.annotation}
          getOptionLabel={annotation => annotation.name}
          getOptionValue={annotation => annotation.scope + annotation.name + annotation.cluster_name}
          onChange={annotation => setDataParams({
            annotation,
            cluster: dataParams.cluster,
            subsample: dataParams.subsample,
            consensus: dataParams.consensus
          })}
          styles={customSelectStyle}/>
      </div>
      <div className="form-group">
        <label>Subsampling</label>
        <Select options={subsampleOptions}
          value={{
            label: dataParams.subsample == '' ? 'All Cells' : dataParams.subsample,
            value: dataParams.subsample
          }}
          onChange={subsample => setDataParams({
            annotation: dataParams.annotation,
            cluster: dataParams.cluster,
            subsample: subsample.value,
            consensus: dataParams.consensus
          })}
          styles={customSelectStyle}/>
      </div>
      { showConsensus &&
        <div className="form-group">
          <label>
            <OverlayTrigger trigger="click" rootClose placement="top" overlay={consensusPopover}>
              <span>View as <FontAwesomeIcon className="action" icon={faInfoCircle}/></span>
            </OverlayTrigger>
          </label>
          <Select options={consensusOptions}
            value={_find(consensusOptions, { value: dataParams.consensus })}
            onChange={consensus => setDataParams({
              annotation: dataParams.annotation,
              cluster: dataParams.cluster,
              subsample: dataParams.subsample,
              consensus: consensus.value
            })}
            styles={customSelectStyle}/>
        </div>
      }
    </div>
  )
}

const consensusPopover = (
  <Popover id="consensus-by-genes-helptext">
    Selecting one of the "violin" options will combine expression scores of multiple genes for each cell using the selected metric.
  </Popover>
)
