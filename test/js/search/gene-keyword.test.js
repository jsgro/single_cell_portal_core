import React from 'react'

import { mount } from 'enzyme'

import { PropsStudySearchProvider } from 'providers/StudySearchProvider'
import GeneKeyword from 'components/search/genes/GeneKeyword'
import { GeneSearchContext } from 'providers/GeneSearchProvider'


describe('Search query display text', () => {
  it('shows blank search form with place holder text present', async () => {
    const wrapper = mount((
      <GeneKeyword placeholder={'I am a place holder'} />
    ))
    expect(wrapper.find('.gene-keyword-search').text().trim()).toEqual('I am a place holder')
  })

  it('shows study result matches search param', async () => {
    const searchState = {
      params: {
        genes: 'PTEN',
        genePage: 1
      },
      results: [],
      isLoading: false,
      isLoaded: false,
      isError: false
    }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: 'PTEN', page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneKeyword placeholder={'I am a place holder'} />
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))
    expect(wrapper.find('.gene-keyword-search').text().trim()).toEqual('PTEN')
  })

  it('show matching multiple params and strips off surronding quotes on search params', async () => {
    const searchState = {
      params: {
        genes: 'PTEN, NA',
        genePage: 1
      },
      results: [],
      isLoading: false,
      isLoaded: false,
      isError: false
    }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '"PTEN", NA', page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneKeyword placeholder={'I am a place holder'} />
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))
    expect(wrapper.find('.gene-keyword-search').text().trim()).toEqual('PTEN,NA')
  })

  it('show that searching on no entered genes provides the generic results ', async () => {
    const searchState = {
      params: {
        genes: '',
        genePage: 1
      },
      results: [],
      isLoading: false,
      isLoaded: false,
      isError: false
    }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '', page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneKeyword placeholder={'I am a place holder'} />
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))
    expect(wrapper.find('.gene-keyword-search').text().trim()).toEqual('I am a place holder')
    wrapper.find('.input-group-append').simulate('click')
    expect(wrapper.find('.gene-keyword-search').text().trim()).toEqual('I am a place holder')
  })
})

