/* show a search result entry from Data Repo */
import React from "react";
export const descriptionCharacterLimit = 750
export const summaryWordLimit = 150

import {getDisplayNameForFacet} from "providers/SearchFacetProvider";

export function shortenDescription(textDescription) {
  const suffixTag = <span className="detail"> ...(continued)</span>
  const displayedStudyDescription = { __html: textDescription.slice(0, descriptionCharacterLimit) }
  if (textDescription.length>descriptionCharacterLimit) {
    return <>
      <span className="studyDescription" dangerouslySetInnerHTML={displayedStudyDescription}></span>{suffixTag}
    </>
  } else {
    return <><span className = 'studyDescription' dangerouslySetInnerHTML={displayedStudyDescription}></span></>
  }
}

/* generate a badge for each matched facet, containing the filter names */
function facetMatchBadges(study) {
  const matches = study.facet_matches
  if (!matches) {
    return <></>
  }
  const matchedKeys = Object.keys(matches)
    .filter(key => key != 'facet_search_weight')
  return (<>
    { matchedKeys.map((key, index) => {
      const helpText = `Metadata match for ${key}`
      return (
        <span key={index}
              className="badge badge-secondary facet-match"
              data-toggle="tooltip"
              title={helpText}>
          {
            matches[key].map(filter => {
              if ('min' in filter) { // numeric facet
                return `${getDisplayNameForFacet(key)} ${filter.min}-${filter.max} ${filter.unit}`
              } else {
                return filter.name
              }
            }).join(',')
          }
        </span>)
    })}
  </>)
}

export default function DataRepoStudy({ study }) {
  const studyDescription = shortenDescription(study.description)
  const displayStudyTitle = { __html: study.name }
  return (
    <>
      <div key={study.accession}>
        <label htmlFor={study.name} id= 'result-title'>
          <a href='#' dangerouslySetInnerHTML = {displayStudyTitle}></a>
        </label>
        <div>
          { facetMatchBadges(study) }
        </div>
        {studyDescription}
      </div>
    </>
  )
}
