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
  @param consensus: string of mean or median (or null)
  @param updateConsensus: update function
 */
export default function ConsensusSelector({
  consensus,
  updateConsensus
}) {
  return (
    <div className="form-group">
      <label>
        <OverlayTrigger trigger="click" rootClose placement="top" overlay={consensusPopover}>
          <span>View as <FontAwesomeIcon className="action" icon={faInfoCircle}/></span>
        </OverlayTrigger>
      </label>
      <Select options={consensusOptions}
        value={_find(consensusOptions, { value: consensus })}
        onChange={newConsensus => updateConsensus(newConsensus.value)}
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


const exploreConsensusOptions = [
  { label: 'None', value: null },
  { label: 'Mean', value: 'mean' },
  { label: 'Median', value: 'median' }
]

/**
  @param consensus: string of mean or median (or null)
  @param updateConsensus: update function
 */
export function ExploreConsensusSelector({
  consensus,
  updateConsensus
}) {
  return (
    <div className="form-group">
      <label>
        <OverlayTrigger trigger="click" rootClose placement="top" overlay={exploreConsensusPopover}>
          <span>Collapse genes by <FontAwesomeIcon className="action" icon={faInfoCircle}/></span>
        </OverlayTrigger>
      </label>
      <Select options={exploreConsensusOptions}
        value={_find(exploreConsensusOptions, { value: consensus })}
        onChange={newConsensus => updateConsensus(newConsensus.value)}
        styles={clusterSelectStyle}/>
    </div>
  )
}

const exploreConsensusPopover = (
  <Popover id="consensus-by-genes-helptext">
    Selecting mean or median will combine expression scores of multiple genes
    for each cell using the selected metric, and allow scatter and violin plot visualization.
  </Popover>
)

