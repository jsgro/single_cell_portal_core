import React from 'react'
import * as ReactAll from 'react'
import { render, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

const fetch = require('node-fetch')

import FacetControl from 'components/search/controls/FacetControl'
import KeywordSearch from 'components/search/controls/KeywordSearch'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'
import * as ScpAPI from 'lib/scp-api'

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

const diseaseFacet = {
  name: 'Disease',
  id: 'disease',
  type: 'string',
  links: [{ name: 'NCBI Taxonomy', url: 'https://foo.tdb' }],
  filters: [
    { id: 'disease1', name: 'd 1' },
    { id: 'disease2', name: 'd 2' },
    { id: 'disease3', name: 'd 3' },
    { id: 'disease4', name: 'd 4' },
    { id: 'disease5', name: 'd 5' },
    { id: 'disease6', name: 'd 6' }
  ],
  links: []
}

describe('Apply applies all changes made in the search panel', () => {
  it('applies keyword changes when applying from a facet', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <KeywordSearch/>
        <FacetControl facet={speciesFacet}/>
      </PropsStudySearchProvider>
    ))

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const keywordInput = function() {
      return container.querySelector('input[name="keywordText"]')
    }

    fireEvent.change(keywordInput(), { target: { value: 'test123' } })
    fireEvent.click(container.querySelector('#facet-species > a'))
    fireEvent.click(speciesControl().querySelector('input#speciesId5'))
    fireEvent.click(speciesControl().querySelector('button.facet-apply-button'))

    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&terms=test123&facets=species%3AspeciesId5')
  })

  it('applies facet changes when keyword searching', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <KeywordSearch/>
        <FacetControl facet={speciesFacet}/>
        <FacetControl facet={diseaseFacet}/>
      </PropsStudySearchProvider>
    ))

    const speciesControl = function() {
      return container.querySelector('#facet-species')
    }
    const diseaseControl = function() {
      return container.querySelector('#facet-disease')
    }
    const keywordInput = function() {
      return container.querySelector('input[name="keywordText"]')
    }

    fireEvent.click(container.querySelector('#facet-species > a'))
    fireEvent.click(speciesControl().querySelector('input#speciesId2'))
    fireEvent.click(container.querySelector('#facet-disease > a'))
    fireEvent.click(diseaseControl().querySelector('input#disease4'))
    fireEvent.change(keywordInput(), { target: { value: 'test345' } })
    fireEvent.submit(keywordInput())
    const query = '?type=study&page=1&terms=test345&facets=species%3AspeciesId2%3Bdisease%3Adisease4'
    expect(routerNav).toHaveBeenLastCalledWith(query)
  })
})
