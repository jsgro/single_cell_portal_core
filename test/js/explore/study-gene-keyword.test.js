import React from 'react'

import { render } from '@testing-library/react'
import StudyGeneField from 'components/explore/StudyGeneField'


describe('Search query display text', () => {

  it('shows study result match for a valid search param', async () => {
    const { container } = render((
       < StudyGeneField genes={['PTEN']} searchGenes={() => {}} allGenes={['PTEN']} speciesList={[]} > 
       </StudyGeneField>
    ))
    expect(container.querySelector(".gene-keyword-search-input").textContent.trim()).toEqual('PTEN')
  })

  it('shows study result matches for multiple valid search params', async () => {
    const { container } = render((
       < StudyGeneField genes={['PTEN', 'GENEA']} searchGenes={() => {}} allGenes={['PTEN', 'GENEA', 'GENEB']} speciesList={[]} > 
       </StudyGeneField>
    ))
    expect(container.querySelector(".gene-keyword-search-input").textContent.trim()).toEqual('PTENGENEA')
  })

})

