import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'lib/cluster-utils'

// value to render in select menu if user has not selected a gene list
const noneSelected = 'None selected...'

/** takes the server response and returns gene list options suitable for react-select */
function getGeneListOptions(studyGeneLists) {
  const assignLabelsAndValues = x => ({ label: x, value: x })
  return [{ label: noneSelected, value: '' }].concat(studyGeneLists.map(assignLabelsAndValues))
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
          label: geneList === '' ? noneSelected : geneList,
          value: geneList
        }}
        options={geneListOptions}
        styles={clusterSelectStyle}
        onChange={newGeneList => updateGeneList(newGeneList.value)}
      />
    </div>
  )
}
