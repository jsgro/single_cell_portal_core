import React from 'react'
import { render, fireEvent } from '@testing-library/react'

import KeywordSearch from 'components/search/controls/KeywordSearch'
import { PropsStudySearchProvider } from 'providers/StudySearchProvider'

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
