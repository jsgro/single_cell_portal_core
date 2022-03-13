import React from 'react'
import * as ReactAll from 'react'
import { render, fireEvent } from '@testing-library/react'
import * as Reach from '@reach/router'

const fetch = require('node-fetch')

import FacetControl from 'components/search/controls/FacetControl'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'

const testNoUnitFacet = {
  name: 'bmi',
  type: 'number',
  id: 'bmi',
  links: [],
  filters: [],
  unit: null,
  max: 50,
  min: 1,
  allUnits: null
}

const testUnitFacet = {
  name: 'age',
  type: 'number',
  id: 'age',
  links: [],
  filters: [],
  unit: 'years',
  max: 150,
  min: 1,
  allUnits: null
}

describe('Filter slider works with facet with no units', () => {
  it('handles slider selections', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const bmiFacet = () => {
      return container.querySelector('#facet-bmi')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <FacetControl facet={testNoUnitFacet}/>
      </PropsStudySearchProvider>
    ))
    fireEvent.click(bmiFacet().querySelector('a'))
    expect(bmiFacet().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)
    expect(bmiFacet().querySelectorAll('input[type="number"]')).toHaveLength(2)
    expect(bmiFacet().querySelectorAll('input[type="number"]')[0].value).toEqual('1')
    expect(bmiFacet().querySelectorAll('input[type="number"]')[1].value).toEqual('50')
    expect(bmiFacet().querySelectorAll('select')).toHaveLength(0)

    fireEvent.change(bmiFacet().querySelector('input[type="number"]'), {
      target: { value: 30 }
    })
    expect(bmiFacet().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)
    fireEvent.click(bmiFacet().querySelector('button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=bmi%3A30%7C50%7C')
  })
})

describe('Filter slider behavior', () => {
  it('handles empty text boxes', async () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    const ageFacet = () => {
      return container.querySelector('#facet-age')
    }
    const { container } = render((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: { age: ['', 150, 'years'] }, page: 1 }}>
        <FacetControl facet={testUnitFacet}/>
      </PropsStudySearchProvider>
    ))
    fireEvent.click(ageFacet().querySelector('a'))
    expect(ageFacet().querySelectorAll('input[type="number"]')).toHaveLength(2)
    expect(ageFacet().querySelectorAll('input[type="number"]')[0].value).toEqual('')
    expect(ageFacet().querySelectorAll('input[type="number"]')[1].value).toEqual('150')
    expect(ageFacet().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(false)

    fireEvent.change(ageFacet().querySelector('input[type="number"]'), {
      target: { value: 30 }
    })
    expect(ageFacet().querySelector('button.facet-apply-button').classList.contains('active')).toEqual(true)
    fireEvent.click(ageFacet().querySelector('button.facet-apply-button'))
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&facets=age%3A30%7C150%7Cyears')
  })
})

