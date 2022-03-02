import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

import MoreFacetsButton from 'components/search/controls/MoreFacetsButton'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'

const testFacets = [{
  id: 'sex',
  name: 'sex',
  filters: [
    { id: 'male', name: 'male' },
    { id: 'female', name: 'female' }
  ],
  links: []
}, {
  id: 'library_protocol',
  name: 'Protocol',
  filters: [
    { id: 'Seq-Well', name: 'Seq-Well' },
    { id: 'inDrop', name: 'inDrop' },
    { id: '10x 3\' v2 sequencing', name: '10x 3\' v2 sequencing' }
  ],
  links: []
}, {
  name: 'organism_age',
  type: 'number',
  id: 'organism_age',
  links: [],
  filters: [],
  unit: 'years',
  max: 180,
  min: 1,
  allUnits: ['years', 'months', 'weeks', 'days', 'hours']
}]

describe('Basic "More facets" capability for faceted search', () => {
  it('the More facets Button should correctly render when facets are selected', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const moreButton = () => {
      return container.querySelector('#more-facets-button')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <MoreFacetsButton facets={testFacets}/>
      </PropsStudySearchProvider>
    ))
    expect(moreButton()).toBeTruthy()
    expect(moreButton().classList.contains('active')).toEqual(false)
    fireEvent.click(container.querySelector('#more-facets-button > a'))
    expect(moreButton().classList.contains('active')).toEqual(true)

    fireEvent.click(container.querySelector('#facet-sex > a'))
    expect(container.querySelector('#facet-sex button.facet-apply-button').classList.contains('disabled')).toEqual(true)

    fireEvent.click(container.querySelector('#facet-sex input#female'))
    expect(container.querySelector('#facet-sex button.facet-apply-button').classList.contains('active')).toEqual(true)

    fireEvent.click(container.querySelector('#facet-sex button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=sex%3Afemale')
  })
})

describe('Filter slider works within more facets', () => {
  it('the More facets Button should correctly render when facets are selected', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const ageFacet = () => {
      return container.querySelector('#facet-organism-age')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <MoreFacetsButton facets={testFacets}/>
      </PropsStudySearchProvider>
    ))
    fireEvent.click(container.querySelector('#more-facets-button > a'))
    fireEvent.click(container.querySelector('#facet-organism-age > a'))

    expect(ageFacet().querySelectorAll('input[type="number"]')).toHaveLength(2)
    expect(ageFacet().querySelectorAll('input[type="number"]')[0].value).toEqual('1')
    expect(ageFacet().querySelectorAll('input[type="number"]')[1].value).toEqual('180')
    expect(ageFacet().querySelectorAll('select')[0].value).toEqual('years')

    fireEvent.change(ageFacet().querySelector('input[type="number"]'), {
      target: { value: 50 }
    })
    expect(ageFacet().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)
    fireEvent.click(container.querySelector('button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=organism_age%3A50%7C180%7Cyears')
  })
})

