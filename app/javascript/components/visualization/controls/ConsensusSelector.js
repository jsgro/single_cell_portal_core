import React from 'react'
import _find from 'lodash/find'
import Select from 'react-select'
import { Popover, OverlayTrigger } from 'react-bootstrap'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { clusterSelectStyle } from 'lib/cluster-utils'


const consensusOptions = [
  { label: 'Dot plot', value: null },
  { label: 'Violin - Mean', value: 'mean' },
  { label: 'Violin - Median', value: 'median' }
]

/**
  @param dataParams: an object specifying cluster, annotation, and subsample selections
  @param updateDataParams: update function for dataParams
 */
export default function ConsensusSelector({
  dataParams,
  updateDataParams
}) {
  return (
    <div className="form-group">
      <label>
        <OverlayTrigger trigger="click" rootClose placement="top" overlay={consensusPopover}>
          <span>View as <FontAwesomeIcon className="action" icon={faInfoCircle}/></span>
        </OverlayTrigger>
      </label>
      <Select options={consensusOptions}
        value={_find(consensusOptions, { value: dataParams.consensus })}
        onChange={consensus => updateDataParams({
          annotation: dataParams.annotation,
          cluster: dataParams.cluster,
          subsample: dataParams.subsample,
          consensus: consensus.value
        })}
        styles={clusterSelectStyle}/>
    </div>
  )
}

const consensusPopover = (
  <Popover id="consensus-by-genes-helptext">
    Selecting one of the &quot;violin&quot; options will combine expression scores of multiple genes
    for each cell using the selected metric.
  </Popover>
)
