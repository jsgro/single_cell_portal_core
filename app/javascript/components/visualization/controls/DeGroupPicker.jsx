import React, { useState } from 'react'
import _clone from 'lodash/clone'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faArrowLeft, faCog, faTimes, faDna, faUndo } from '@fortawesome/free-solid-svg-icons'
import Modal from 'react-bootstrap/lib/Modal'

import Select from '~/lib/InstrumentedSelect'
import { clusterSelectStyle } from '~/lib/cluster-utils'
import { newlineRegex } from '~/lib/validation/io'
import { fetchBucketFile } from '~/lib/scp-api'

// value to render in select menu if user has not selected a gene list
const noneSelected = 'Select a group'

/** Takes array of strings, converts it to list options suitable for react-select */
function getSimpleOptions(stringArray) {
  const assignLabelsAndValues = x => ({ label: x, value: x })
  return [{ label: noneSelected, value: '' }].concat(stringArray.map(assignLabelsAndValues))
}

const nonAlphaNumericRE = /\W/g

/** Pick groups of cells for differential expression (DE) */
export default function DeGroupPicker({ exploreInfo, setShowDeGroupPicker, updateDeGroup }) {
  console.log('in DeGroupPicker, exploreInfo:')
  console.log(exploreInfo)
  const annotation = exploreInfo?.annotationList?.default_annotation
  const groups = annotation?.values ?? []

  // const [groupOptions, setGroupOptions] = useState(getGroupOptions(groups))

  const [group, setGroup] = useState(noneSelected)

  /** Update group in DE picker */
  async function fetchGroup() {
    const bucketId = exploreInfo?.bucketId

    // <cluster_name>--<annotation_name>--<group_name>--<annotation_scope>--<method>.tsv
    const deFileName = `${[
      exploreInfo?.annotationList?.default_cluster,
      annotation.name,
      group,
      'wilcoxon'
      // annotation.scope
    ]
      .map(s => s.replaceAll(nonAlphaNumericRE, '_'))
      .join('--') }.tsv`

    const deFilePath = `_scp-internal/de/${deFileName}`.replaceAll('/', '%2F')

    const gcsUrlBase = 'https://www.googleapis.com/storage/v1/b/'
    const deUrl = `${gcsUrlBase}${bucketId}/o/${deFilePath}?alt=media`


    console.log('deUrl')
    console.log(deUrl)
    const data = await fetchBucketFile(bucketId, deFilePath)
    const tsv = await data.text()
    console.log('tsv')
    console.log(tsv)
    const tsvLines = tsv.split(newlineRegex)

    // `<cluster_name>--<annotation_name>--<group_name>--<annotation_scope>--<method>.tsv
    // fetchDeFromBucket()
    setShowDeGroupPicker(false)
  }

  console.log('group')
  console.log(group)

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
            onChange={newGroup => setGroup(newGroup.value)}
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
        <button className="btn btn-primary" onClick={() => {fetchGroup()}}>OK</button>
        <button className="btn terra-btn-secondary" onClick={() => setShowDeGroupPicker(false)}>Cancel</button>
      </Modal.Footer>
    </Modal>
  )
}
