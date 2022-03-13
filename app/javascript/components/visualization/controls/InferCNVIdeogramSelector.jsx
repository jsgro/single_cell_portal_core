import React from 'react'

import Select from '~/lib/InstrumentedSelect'
import { clusterSelectStyle } from '~/lib/cluster-utils'

// value to render in select menu if user has not selected a gene list
const noneSelected = 'None selected...'

/** takes the server response and returns inferCNV/ideogram options suitable for react-select */
function getInferCNVIdeogramOptions(studyInferCNVIdeogramFiles) {
  const inferCNVSelectOpts = []
  for (const [fileId, ideogramOptions] of Object.entries(studyInferCNVIdeogramFiles)) {
    inferCNVSelectOpts.push({ label: ideogramOptions.display, value: fileId })
  }
  return [{ label: noneSelected, value: '' }].concat(inferCNVSelectOpts)
}

/** find the matching option to a given filename string */
function getMatchedIdeogramOption(ideogramFile, studyInferCNVIdeogramFiles) {
  if (ideogramFile && studyInferCNVIdeogramFiles) {
    const matchedOption = studyInferCNVIdeogramFiles.find(a => {
      return a.value === ideogramFile
    })
    return matchedOption
  }
  return { label: noneSelected, value: '' }
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
  const matchedIdeogramOption = getMatchedIdeogramOption(inferCNVIdeogramFile, inferCNVIdeogramOptions)
  return (
    <div className="form-group">
      <label className="labeled-select">Ideogram Files
        <Select
          data-analytics-name="infercnv-select"
          value={matchedIdeogramOption}
          options={inferCNVIdeogramOptions}
          styles={clusterSelectStyle}
          onChange={newInferCNVIdeogramFile => updateInferCNVIdeogramFile(newInferCNVIdeogramFile.value)}
        />
      </label>
    </div>
  )
}
