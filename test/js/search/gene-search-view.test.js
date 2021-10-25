import React from 'react'
import { mount } from 'enzyme'
import GeneSearchView from 'components/search/genes/GeneSearchView'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'
import { GeneSearchContext, emptySearch } from 'providers/GeneSearchProvider'
import StudySearchResult from 'components/search/results/StudySearchResult'


describe('Gene search page landing', () => {
  it('shows study details when empty', async () => {
    const searchState = emptySearch
    searchState.isLoaded = true
    searchState.results = { studies: [{ name: 'foo', description: 'bar' }] }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneSearchView/>
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))
    expect(wrapper.find(StudySearchResult)).toHaveLength(1)
  })

  it('shows gene results when gene query is loaded', async () => {
    const searchState = emptySearch
    searchState.isLoaded = true
    searchState.results = { studies: [{ name: 'foo', description: 'bar', gene_matches: ['agpat2'] }] }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneSearchView/>
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))

    expect(wrapper.find(StudySearchResult)).toHaveLength(0)
    const wrapperText = wrapper.find('.study-gene-result').text()
    expect(wrapperText.indexOf('This study contains agpat2 in expression data')).toBeGreaterThan(0)
  })

  it('clears gene queries', async () => {
    const searchState = emptySearch
    searchState.isLoaded = true
    searchState.results = { studies: [{ name: 'foo', description: 'bar', gene_matches: ['agpat2'] }] }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneSearchView/>
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))

    expect(wrapper.find(StudySearchResult)).toHaveLength(0)
    const wrapperText = wrapper.find('.study-gene-result').text()
    expect(wrapperText.indexOf('This study contains agpat2 in expression data')).toBeGreaterThan(0)
  })


  it('shows gene results when multigene query is loaded', async () => {
    const searchState = emptySearch
    searchState.isLoaded = true
    searchState.results = { studies: [{ name: 'foo', description: 'bar', gene_matches: ['agpat2', 'farsa'] }] }
    const wrapper = mount((
      <PropsStudySearchProvider searchParams={{ terms: '', facets: {}, page: 1 }}>
        <GeneSearchContext.Provider value={searchState}>
          <GeneSearchView/>
        </GeneSearchContext.Provider>
      </PropsStudySearchProvider>
    ))

    expect(wrapper.find(StudySearchResult)).toHaveLength(0)
    const wrapperText = wrapper.find('.study-gene-result').text()
    expect(wrapperText.indexOf('This study contains agpat2, farsa in expression data')).toBeGreaterThan(0)
  })
})
