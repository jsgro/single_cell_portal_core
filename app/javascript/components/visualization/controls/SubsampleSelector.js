import React from 'react'
import Select from 'react-select'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Popover, OverlayTrigger } from 'react-bootstrap'

import { clusterSelectStyle } from 'lib/cluster-utils'


/** takes the server response and returns subsample options suitable for react-select */
function getSubsampleOptions(annotationList, clusterName) {
  let subsampleOptions = []
  if (clusterName && annotationList.subsample_thresholds) {
    let clusterSubsamples = annotationList.subsample_thresholds[clusterName]
    if (!clusterSubsamples) {
      clusterSubsamples = []
    }
    subsampleOptions = subsampleOptions.concat(clusterSubsamples.map(num => {
      // convert everything to strings to make the comparisons easier
      return { label: `${num}`, value: `${num}` }
    }))
  }
  subsampleOptions.push({ label: 'All Cells', value: 'all' })
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
      <label>
        <OverlayTrigger trigger="click" rootClose placement="top" overlay={subsamplingPopover}>
          <span>Subsampling <FontAwesomeIcon data-analytics-name="subsampling-help-icon"
            className="action log-click help-icon" icon={faInfoCircle}/>
          </span>
        </OverlayTrigger>
      </label>
      <Select options={subsampleOptions}
        value={{
          label: subsample == 'all' ? 'All Cells' : `${subsample}`,
          value: `${subsample}`
        }}
        onChange={newSubsample => updateClusterParams({
          subsample: newSubsample.value
        })}
        styles={clusterSelectStyle}/>
    </div>
  )
}

const subsamplingPopover = (
  <Popover id="explore-subsampling-helptext">
    Show a representative subsample of the current clusters
    (<a href='https://singlecell.zendesk.com/hc/en-us/articles/360060610032-Cluster-File-Subsampling'
      rel="noreferrer" target='_blank'>learn more</a>).
    <br/>
    <span className="detail">
      Choosing &quot;All cells&quot; may dramatically increase rendering time for studies with &gt;100K cells.
    </span>
  </Popover>
)
