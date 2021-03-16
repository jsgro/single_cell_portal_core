import React from 'react'
import Select from 'react-select'

import { clusterSelectStyle } from 'lib/cluster-utils'

// value to render in select menu if user has not selected a gene list
const noneSelected = "None selected..."

/** takes the server response and returns inferCNV/ideogram options suitable for react-select */
function getInferCNVIdeogramOptions(studyInferCNVIdeogramFiles) {
  let inferCNVSelectOpts = []
  for (const [fileId, ideogramOptions] of Object.entries(studyInferCNVIdeogramFiles)) {
    inferCNVSelectOpts.push({label: ideogramOptions.display, value: fileId})
  }
  return [{label: noneSelected, value: ''}].concat(inferCNVSelectOpts)
}

function getMatchedIdeogramOption(ideogramFile, studyInferCNVIdeogramFiles) {
  if (ideogramFile && studyInferCNVIdeogramFiles) {
    const matchedOption = studyInferCNVIdeogramFiles.find(a => {
      return a.value === ideogramFile
    })
    return matchedOption
  }
  return {label: noneSelected, value: ''}
}

/**
  Renders a gene list selector.
    @param inferCNVIdeogramFile: requested inferCNV/ideogram annotations file to load.
    @param studyInferCNVIdeogramFiles: collection of all inferCNV/ideogram annotations for a study
    @param updateInferCNVIdeogramFile: update function to set the inferCNV/ideogram annotation file
 */
export default function InferCNVIdeogramSelector({
  inferCNVIdeogramFile,
  studyInferCNVIdeogramFiles,
  updateInferCNVIdeogramFile
}) {
  if (!studyInferCNVIdeogramFiles || studyInferCNVIdeogramFiles.length === 0) {
    return <></>
  }
  const inferCNVIdeogramOptions = getInferCNVIdeogramOptions(studyInferCNVIdeogramFiles)
  let matchedIdeogramOption = getMatchedIdeogramOption(inferCNVIdeogramFile, inferCNVIdeogramOptions)
  return (
    <div className="form-group">
      <label>Ideogram Files</label>
      <Select
        value={matchedIdeogramOption}
        options={inferCNVIdeogramOptions}
        styles={clusterSelectStyle}
        onChange={newInferCNVIdeogramFile => updateInferCNVIdeogramFile(newInferCNVIdeogramFile.value)}
      />
    </div>
  )
}
