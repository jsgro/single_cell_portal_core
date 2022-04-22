import React, { useState } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faArrowLeft, faCog, faTimes, faDna, faUndo } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'

import Select from '~/lib/InstrumentedSelect'
import { clusterSelectStyle } from '~/lib/cluster-utils'

// value to render in select menu if user has not selected a gene list
const noneSelected = 'Select a group...'

/** Takes array of strings, converts it to list options suitable for react-select */
function getSimpleOptions(stringArray) {
  const assignLabelsAndValues = x => ({ label: x, value: x })
  return [{ label: noneSelected, value: '' }].concat(stringArray.map(assignLabelsAndValues))
}

/** Pick groups of cells for differential expression (DE) */
export default function DeGroupPicker({ exploreInfo, setShowDeGroupPicker }) {
  console.log('in DeGroupPicker, exploreInfo:')
  console.log(exploreInfo)
  const groups = exploreInfo?.annotationList?.default_annotation?.values ?? []

  // const [groupOptions, setGroupOptions] = useState(getGroupOptions(groups))

  const [group, setGroup] = useState(groups[0])

  /** Update group in DE picker */
  function updateGroup(newGroup) {
    console.log('in updateGroup')
    setGroup(newGroup)
  }

  return (
    <Modal
      id='de-group-picker-modal'
      onHide={() => setShowDeGroupPicker(false)}
      show={true}
      animation={false}
      bsSize='small'>
      <Modal.Body>
        <div className="flexbox-align-center flexbox-column">
          <span>Choose a group to compare to all other groups</span>
          <Select
            options={getSimpleOptions(groups)}
            data-analytics-name="de-group-select"
            value={{
              label: group === '' ? noneSelected : group,
              value: group
            }}
            // getOptionLabel={group1 => group1}
            // getOptionValue={group1 => group1}
            onChange={newGroup => updateGroup(newGroup)}
            styles={clusterSelectStyle}
          />
          {/* <span className="flexbox-align-center">
      #<HexColorInput color={pickedGroup} onChange={setPickedColor}/>
      &nbsp;
        <span className="preview-block" style={{ background: pickedGroup }}></span>
      </span>
      <HexDeGroupPicker color={pickedGroup} onChange={setPickedColor}/> */}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={() => {}}>OK</button>
        <button className="btn terra-btn-secondary" onClick={() => setShowDeGroupPicker(false)}>Cancel</button>
      </Modal.Footer>
    </Modal>
  )
}
