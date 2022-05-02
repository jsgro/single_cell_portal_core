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

/**
 * Fetch array of gene differential expression data
 *
 * Each element in the array is DE data for the gene in this row
 *   name: Gene name
 *   score: Differential expression score assigned by Scanpy.
 *   log2FoldChange: Log-2 fold change.  How many times more expression (1 = 2, 2 = 4, 3 = 8).
 *   pval: p-value.  Statistical significance of the `score` value.
 *   pvalAdj: Adjusted p-value.  p-value adjusted for false discovery rate (FDR).
 *   pctNzGroup: Percent non-zero, group.  % of cells with non-zero expression in selected group.
 *   pctNzReference: Percent non-zero, reference.  % of cells with non-zero expression in non-selected groups.
 **/
async function fetchDeGenes(bucketId, deFileName) {
  const deFilePath = `_scp-internal/de/${deFileName}`.replaceAll('/', '%2F')

  const data = await fetchBucketFile(bucketId, deFilePath)
  const tsv = await data.text()
  const tsvLines = tsv.split(newlineRegex)
  const deGenes = []
  for (let i = 1; i < tsvLines.length; i++) {
    // Each element in this array is DE data for the gene in this row
    const [
      index, // eslint-disable-line
      name, score, log2FoldChange, pval, pvalAdj, pctNzGroup, pctNzReference
    ] = tsvLines[i].split('\t')
    const deGene = {
      score, log2FoldChange, pval, pvalAdj, pctNzGroup, pctNzReference
    }
    Object.entries(deGene).forEach(([k, v]) => {
      // Cast numeric string values as floats
      deGene[k] = parseFloat(v)
    })
    deGene.name = name
    deGenes.push(deGene)
  }

  return deGenes.slice(0, 20)
}

/** Pick groups of cells for differential expression (DE) */
export default function DeGroupPicker({
  exploreInfo, setShowDeGroupPicker, setDeGroup, setDeGenes
}) {
  const annotation = exploreInfo?.annotationList?.default_annotation
  const groups = annotation?.values ?? []

  const [group, setGroup] = useState(noneSelected)

  /** Update group in DE picker */
  async function updateDeGroup() {
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

    const deGenes = await fetchDeGenes(bucketId, deFileName)

    setDeGroup(group)
    setDeGenes(deGenes)

    setShowDeGroupPicker(false)
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
            onChange={newGroup => setGroup(newGroup.value)}
            styles={clusterSelectStyle}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={() => {updateDeGroup()}}>OK</button>
        <button className="btn terra-btn-secondary" onClick={() => setShowDeGroupPicker(false)}>Cancel</button>
      </Modal.Footer>
    </Modal>
  )
}
