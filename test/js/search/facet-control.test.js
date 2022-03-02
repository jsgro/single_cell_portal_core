import React from 'react'
import * as ReactAll from 'react'
import { render, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

const fetch = require('node-fetch')

import FacetControl from 'components/search/controls/FacetControl'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'

const speciesFacet = {
  name: 'Species',
  id: 'species',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'speciesId1', name: 'name 1' },
    { id: 'speciesId2', name: 'name 2' },
    { id: 'speciesId3', name: 'name 3' },
    { id: 'speciesId4', name: 'name 4' },
    { id: 'speciesId5', name: 'name 5' },
    { id: 'speciesId6', name: 'name 6' }
  ],
  links: []
}

describe('Facet control handles selections appropriately', () => {
  it('handles multiple checkbox selections', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>

        <FacetControl facet={speciesFacet}/>
      </PropsStudySearchProvider>
    ))

    expect(speciesControl()).toBeTruthy()
    expect(speciesControl().classList.contains('active')).toEqual(false)
    fireEvent.click(container.querySelector('#facet-species > a'))
    expect(speciesControl().classList.contains('active')).toEqual(true)

    expect(speciesControl().querySelectorAll('.facet-filter-list li'))
      .toHaveLength(speciesFacet.filters.length)

    // after clicking, apply is enabled, and a badge for the selection is shown
    fireEvent.click(speciesControl().querySelector('input#speciesId5'))
    expect(speciesControl().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)
    expect(speciesControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(1)
    expect(speciesControl().querySelector('.filter-badge-list .badge').textContent.trim()).toEqual('name 5')

    // after unselect, apply is disabled, and a badge for the selection is removed
    fireEvent.click(speciesControl().querySelector('input#speciesId5'))
    expect(speciesControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(0)

    // after two selections, two badges are shown
    fireEvent.click(speciesControl().querySelector('input#speciesId3'))
    fireEvent.click(speciesControl().querySelector('input#speciesId6'))
    expect(speciesControl().querySelectorAll('.filter-badge-list .badge')).toHaveLength(2)

    // apply sends a routing request to the right url
    fireEvent.click(speciesControl().querySelector('button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=species%3AspeciesId3%7CspeciesId6')
  })
})

const longSpeciesFacet = {
  name: 'Species',
  id: 'species',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'speciesId1', name: 'name 1' },
    { id: 'speciesId2', name: 'name 2' },
    { id: 'speciesId3', name: 'name 3' },
    { id: 'speciesId4', name: 'name 4' },
    { id: 'speciesId5', name: 'name 5' },
    { id: 'speciesId6', name: 'name 6' },
    { id: 'speciesId7', name: 'name 7' },
    { id: 'speciesId8', name: 'name 8' },
    { id: 'speciesId9', name: 'name 9' },
    { id: 'speciesId10', name: 'name 10' },
    { id: 'speciesId11', name: 'name 11' },
    { id: 'speciesId12', name: 'name 12' },
    { id: 'speciesId13', name: 'name 13' },
    { id: 'speciesId14', name: 'name 14' },
    { id: 'speciesId15', name: 'name 15' },
    { id: 'speciesId16', name: 'name 16' },
    { id: 'speciesId17', name: 'name 17' },
    { id: 'speciesId18', name: 'name 18' },
    { id: 'speciesId19', name: 'name 19' },
    { id: 'speciesId20', name: 'name 20' },
    { id: 'speciesId21', name: 'name 21' },
    { id: 'speciesId22', name: 'name 22' }
  ],
  links: []
}

describe('Facet control handles facets with many filters', () => {
  it('truncates the list when appropriate', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <FacetControl facet={longSpeciesFacet}/>
      </PropsStudySearchProvider>
    ))

    fireEvent.click(container.querySelector('#facet-species > a'))
    // by default, only show the first 15 filters
    expect(speciesControl().querySelectorAll('.facet-filter-list li')).toHaveLength(22)

    fireEvent.click(speciesControl().querySelector('input#speciesId2'))
    expect(speciesControl().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)

    fireEvent.click(speciesControl().querySelector('button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=species%3AspeciesId2')
  })
})
