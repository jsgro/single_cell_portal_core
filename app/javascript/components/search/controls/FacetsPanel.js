import React, { useState } from 'react'

import FacetControl from './FacetControl'
import CombinedFacetControl from './CombinedFacetControl'
import MoreFacetsButton from './MoreFacetsButton'
import { fetchFacets } from 'lib/scp-api'

const defaultFacetIds = ['disease', 'species']
const moreFacetIds = [
  'sex', 'race', 'library_preparation_protocol', 'organism_age'
]

/**
 * this may evolve into something more sophisticated, or with actual
 * message keys, but for now it just converts snake case to word case
 * see https://broadworkbench.atlassian.net/browse/SCP-2108
 */
export function getDisplayNameForFacet(facetId) {
  return facetId.replace(/__|_/gi, ' ')
}


/**
 * Container for horizontal list of facet buttons, and "More Facets" button
 */
export default function FacetsPanel({ facets }) {
  const [facetState, setFacetState] = useState({
    facets: [],
    isLoading: false,
    isLoaded: false
  })
  /** fetch the facet list from the server */
  async function updateFacets() {
    setFacetState({
      facets: [],
      isLoading: true,
      isLoaded: false
    })
    const facets = await fetchFacets()
    setFacetState({
      facets,
      isLoading: false,
      isLoaded: true
    })
  }

  if (!facetState.isLoading && !facetState.isLoaded) {
    updateFacets()
  }

  const defaultFacets = facets.filter(facet => defaultFacetIds.includes(facet.id))
  const moreFacets = facets.filter(facet => moreFacetIds.includes(facet.id))
  return (
    <>
      <CombinedFacetControl controlDisplayName="cell type" facetIds={['cell_type', 'cell_type__custom']}/>
      <CombinedFacetControl controlDisplayName="organ" facetIds={['organ', 'organ_region']}/>
      {
        defaultFacets.map((facet, i) => {
          return <FacetControl facet={facet} key={i}/>
        })
      }
      <MoreFacetsButton facets={moreFacets} />
    </>
  )
}
