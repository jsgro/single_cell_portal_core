import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'

import KeywordSearch from 'components/search/controls/KeywordSearch'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'
import * as Reach from '@reach/router'

describe('<KeywordSearch/> rendering>', () => {
  it('should render </KeywordSearch> elements', () => {
    const { container } = render(<KeywordSearch/>)
    expect(container.getElementsByClassName('study-keyword-search')).toHaveLength(1)
    expect(container.getElementsByClassName('fa-search')).toHaveLength(1)
  })

  it('should show the clear button after text is entered', () => {
    const { container } = render(
      <PropsStudySearchProvider searchParams={{ terms: '' }}>
        <KeywordSearch/>
      </PropsStudySearchProvider>
    )
    expect(container.getElementsByClassName('fa-times')).toHaveLength(0)
    const input = container.querySelector('input[name="keywordText"]')
    fireEvent.change(input, { target: { value: 'test123' } })
    expect(container.getElementsByClassName('fa-times')).toHaveLength(1)
  })
})

describe('Searching and routerNav', () => {
  it('should do a search with uppercased accession even if given lowercased term', () => {
    const routerNav = jest.spyOn(Reach, 'navigate')

    render((
      <PropsStudySearchProvider searchParams={{ terms: 'scp9', facets: {}, page: 1 }}>
        <KeywordSearch></KeywordSearch>
=        </PropsStudySearchProvider>
    ))

    fireEvent.click(screen.getByTestId('submit-search'))

    // see that the term is now uppercased
    expect(routerNav).toHaveBeenLastCalledWith('?type=study&page=1&terms=SCP9')
  })
})
