import React from 'react'
import { screen, render, fireEvent } from '@testing-library/react'

import CreateAnnotation from 'components/visualization/controls/CreateAnnotation'

describe('create annotation toggles appropriately', () => {
  it('shows the loading spinner while waiting for explore data', async () => {
    const { container } = render(
      <CreateAnnotation
        isSelecting={false}
        annotationList={null}
        setIsSelecting={() => {}}/>
    )
    let panel = container.querySelectorAll('Panel.create-annotation')[0]
    expect(screen.queryByText('Create')).toEqual(null)
    expect(container.querySelector('.gene-load-spinner')).toBeTruthy()

    const { container: container2 } = render(
      <CreateAnnotation
        isSelecting={false}
        annotationList={{annotations: [], clusters: []}}
        setIsSelecting={() => {}}/>
    )
    expect(screen.getByText('Create')).toBeTruthy()
    expect(container2.querySelector('.gene-load-spinner')).toBeFalsy()
  })
})
