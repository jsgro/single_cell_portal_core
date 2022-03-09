import React from 'react'
import * as ReactAll from 'react'
import { render, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

const fetch = require('node-fetch')

import CombinedFacetControl from 'components/search/controls/CombinedFacetControl'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'
import { SearchFacetContext } from 'providers/SearchFacetProvider'
import * as ScpAPI from 'lib/scp-api'

const organFacet = {
  name: 'Organ',
  id: 'organ',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'organId1', name: 'name 1' },
    { id: 'organId2', name: 'name 2' },
    { id: 'organId3', name: 'name 3' },
    { id: 'organId4', name: 'name 4' },
    { id: 'organId5', name: 'name 5' },
    { id: 'organId6', name: 'name 6' }
  ],
  links: []
}

const organRegionFacet = {
  name: 'Organ',
  id: 'organ_region',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'organRegionId1', name: 'name 1' },
    { id: 'organRegionId2', name: 'name 2' },
    { id: 'organRegionId3', name: 'name 3' },
    { id: 'organRegionId4', name: 'name 4' },
    { id: 'organRegionId5', name: 'name 5' },
    { id: 'organRegionId6', name: 'name 6' }
  ],
  links: []
}

describe('facets work within the multi-facet container', () => {
  it('handles multiple checkbox selections in a single facet', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const facetContext = {
      facets: [organFacet, organRegionFacet],
      isLoading: false,
      isLoaded: false
    }
    const organControl = function() {
      return container.querySelector('#filters-box-searchable-organ')
    }
    const applyButton = function() {
      return container.querySelector('button.facet-apply-button')
    }

    const { container } = render((
      <SearchFacetContext.Provider value={facetContext}>
        <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
          <CombinedFacetControl facetIds={['organ', 'organ_region']} controlName="organC"/>
        </PropsStudySearchProvider>
      </SearchFacetContext.Provider>
    ))

    expect(container.querySelectorAll('.facet')).toHaveLength(1)
    expect(container.querySelector('.facet').classList.contains('active')).toEqual(false)
    expect(container.querySelectorAll('.multi-facet-container')).toHaveLength(0)

    fireEvent.click(container.querySelector('.facet > a'))
    expect(container.querySelector('.facet').classList.contains('active')).toEqual(true)
    expect(applyButton().classList.contains('active')).toEqual(false)
    expect(container.querySelectorAll('.multi-facet-container')).toHaveLength(1)
    expect(applyButton()).toBeTruthy()
    expect(organControl().querySelectorAll('.facet-filter-list li')).toHaveLength(organFacet.filters.length)

    // after clicking, apply is enabled, and a badge for the selection is shown
    fireEvent.click(organControl().querySelector('input#organId5'))
    expect(applyButton().classList.contains('active')).toEqual(true)
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(1)
    expect(organControl().querySelector('.filter-badge-list .badge').textContent.trim()).toEqual('name 5')

    // after unselect, apply is disabled, and a badge for the selection is removed
    fireEvent.click(organControl().querySelector('input#organId5'))
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(0)

    // after two selections, two badges are shown
    fireEvent.click(organControl().querySelector('input#organId3'))
    fireEvent.click(organControl().querySelector('input#organId6'))
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(2)

    // apply sends a routing request to the right url
    fireEvent.click(applyButton())
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=organ%3AorganId3%7CorganId6')
  })

  it('handles multiple checkbox selections across two facets', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const facetContext = {
      facets: [organFacet, organRegionFacet],
      isLoading: false,
      isLoaded: false
    }
    const organControl = function() {
      return container.querySelector('#filters-box-searchable-organ')
    }
    const organRegionControl = function() {
      return container.querySelector('#filters-box-searchable-organ_region')
    }
    const applyButton = function() {
      return container.querySelector('button.facet-apply-button')
    }
    const clearButton = function() {
      return container.querySelector('span.clear-filters')
    }

    const { container } = render((
      <SearchFacetContext.Provider value={facetContext}>
        <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
          <CombinedFacetControl facetIds={['organ', 'organ_region']} controlName="organC"/>
        </PropsStudySearchProvider>
      </SearchFacetContext.Provider>
    ))

    fireEvent.click(container.querySelector('.facet > a'))

    // after clicking, apply is enabled, and a badge for the selection is shown
    fireEvent.click(organControl().querySelector('input#organId5'))
    fireEvent.click(organRegionControl().querySelector('input#organRegionId1'))
    fireEvent.click(organRegionControl().querySelector('input#organRegionId3'))
    expect(applyButton().classList.contains('active')).toEqual(true)
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(1)
    expect(organRegionControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(2)

    // after clear, both facets are cleared
    fireEvent.click(clearButton())
    expect(applyButton().querySelector('active')).toBeFalsy()
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(0)
    expect(organRegionControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(0)

    // after more selections, apply sends a routing request to the right url
    fireEvent.click(organControl().querySelector('input#organId6'))
    fireEvent.click(organRegionControl().querySelector('input#organRegionId2'))
    fireEvent.click(organRegionControl().querySelector('input#organRegionId4'))
    fireEvent.click(applyButton())
    const queryString = '?type=study&page=1&facets=organ%3AorganId6%3Borgan_region%3AorganRegionId2%7CorganRegionId4'
    expect(routerNav).toHaveBeenLastCalledWith(queryString)
  })

  it('handles where one facet of the combination is not populated in the environment', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const facetContext = {
      facets: [organFacet],
      isLoading: false,
      isLoaded: false
    }
    const organControl = function() {
      return container.querySelector('#filters-box-searchable-organ')
    }
    const applyButton = function() {
      return container.querySelector('button.facet-apply-button')
    }
    const clearButton = function() {
      return container.querySelector('span.clear-filters')
    }

    const { container } = render((
      <SearchFacetContext.Provider value={facetContext}>
        <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
          <CombinedFacetControl facetIds={['organ', 'organ_region']} controlName="organC"/>
        </PropsStudySearchProvider>
      </SearchFacetContext.Provider>
    ))

    fireEvent.click(container.querySelector('.facet > a'))

    // after clicking, apply is enabled, and a badge for the selection is shown
    expect(container.querySelectorAll('#filters-box-searchable-organ')).toHaveLength(1)
    expect(container.querySelectorAll('#filters-box-searchable-organ_region')).toHaveLength(0)
    fireEvent.click(organControl().querySelector('input#organId5'))
    expect(applyButton().classList.contains('active')).toEqual(true)
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(1)

    // clear still works
    fireEvent.click(clearButton())
    expect(applyButton().classList.contains('active')).toEqual(false)
    expect(organControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(0)

    // apply still works
    fireEvent.click(organControl().querySelector('input#organId6'))
    fireEvent.click(applyButton())
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=organ%3AorganId6')
  })
})

