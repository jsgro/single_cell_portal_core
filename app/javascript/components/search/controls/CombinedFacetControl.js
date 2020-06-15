import React, { useContext, useState } from 'react'
import _find from 'lodash/find'

import { StudySearchContext } from 'providers/StudySearchProvider'
import { SearchFacetContext } from 'providers/SearchFacetProvider'
import FiltersBoxSearchable from './FiltersBoxSearchable'
import { ApplyButton, ClearFilters } from './FiltersBox'
import { SearchSelectionContext, isFacetApplicable, getSelectionForFacet } from 'providers/SearchSelectionProvider'
import useCloseableModal from 'hooks/closeableModal'
import _kebabCase from 'lodash/kebabCase'
import _compact from 'lodash/compact'

/**
 * Component for combining two facets into a single panel control.
 * They will be rendered more or less independently, but with a single 'apply' button
 *
 * Note that this does NOT support numeric facets -- to support those the display CSS would have to be
 * updated and the handleApplyClick() numeric logic from FiltersBox would have to be included
 */
export default function CombinedFacetControl({ controlName, facetNames }) {
  const [showFilters, setShowFilters] = useState(false)
  const facetContext = useContext(SearchFacetContext)
  const selectionContext = useContext(SearchSelectionContext)
  const searchContext = useContext(StudySearchContext)


  const facetContents = _compact(facetNames.map(facetId => {
    const facet = _find(facetContext.facets, { id: facetId })
    if (!facet) {
      return null
    }
    const selection = getSelectionForFacet(facet, selectionContext)
    return { facet, selection }
  }))

  const { node, handleButtonClick } = useCloseableModal(showFilters, setShowFilters)

  const canApply = facetContents.map(facetContent => {
    return isFacetApplicable(facetContent.facet, selectionContext, searchContext)
  }).some(canApply => {return canApply})

  const canClear = facetContents.map(facetContent => {
    return facetContent.selection.length > 0
  }).some(canClear => {return canClear})

  /** clear the selection, don't perform the search */
  function clearFilters() {
    const updatedSelection = { facets: {} }
    facetContents.forEach(facetContent => {
      updatedSelection.facets[facetContent.facet.id] = []
    })
    selectionContext.updateSelection(updatedSelection)
  }

  /** do the search and close the modal */
  function handleApplyClick() {
    if (!canApply) return
    selectionContext.performSearch()
    if (setShowFilters) {
      setShowFilters(false)
    }
  }

  if (facetContents.length != facetNames.length) {
    // either this instance doesn't the facets populated, or the facets havent finished loading yet
    return <span></span>
  }

  return (
    <span ref={node} className={`facet ${showFilters ? 'active' : ''}`}>
      <a onClick={handleButtonClick}>
        {controlName}
      </a>
      {
        showFilters && <div className="filters-box-searchable combined-facet">
          <div className="multi-facet-container">
            { facetContents.map((facetContent, index) => {
              return facetContent.facet &&
                <div className="single-facet" key={facetContent.facet.id}>
                  <h4>{facetContent.facet.name}</h4>
                  <FiltersBoxSearchable
                    show={showFilters}
                    facet={facetContent.facet}
                    setShow={ () => {} }
                    selection={facetContent.selection}
                    setSelection={selection =>
                      selectionContext.updateFacet(facetContent.facet.id, selection)
                    }
                    hideControls={ true }/>
                </div>
            })
            }
          </div>
          <div className='filters-box-footer'>
            {canClear &&
                <ClearFilters
                  facetId={_kebabCase(controlName)}
                  onClick={clearFilters}
                />
            }
            <ApplyButton
              facetId={_kebabCase(controlName)}
              isActive={canApply}
              onClick={handleApplyClick}
            />
          </div>
        </div>
      }
    </span>
  )
}
