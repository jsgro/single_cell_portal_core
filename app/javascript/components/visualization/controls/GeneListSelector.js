import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'lib/cluster-utils'

/** takes the server response and returns subsample options suitable for react-select */
function getGeneListOptions(studyGeneLists) {
  let geneListObjects = [{label: 'None', value: ''}]
  geneListObjects = geneListObjects.concat(studyGeneLists.map(geneList => {
    return { label: geneList, value: geneList }
  }))
  return geneListObjects
}


/**
  Renders a gene list selector.
    @param geneList: requested gene list to load.
    @param studyGeneLists: collection of all gene lists for a study
    @param updateGeneList: update function to set the gene list
 */
export default function GeneListSelector({
  geneList,
  studyGeneLists,
  updateGeneList
}) {
  if (!studyGeneLists || studyGeneLists.length === 0) {
    return <></>
  }
  const geneListOptions = getGeneListOptions(studyGeneLists)
  return (
    <div className="form-group">
      <label>Gene Lists</label>
      <Select
        value={{
          label: geneList === '' ? 'None' : geneList,
          value: geneList
        }}
        options={geneListOptions}
        styles={clusterSelectStyle}
        onChange={newGeneList => updateGeneList(newGeneList.value)}
      />
    </div>
  )
}
