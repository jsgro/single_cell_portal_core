import React from 'react'
import { mount } from 'enzyme'

import CreateAnnotation from 'components/visualization/controls/CreateAnnotation'

describe('create annotation toggles appropriately', () => {
  it('lets you open the pane', async () => {
    const wrapper = mount((
      <CreateAnnotation
        isSelecting={false}
        setIsSelecting={() => {}}/>
    ))
    let panel = wrapper.find('Panel.create-annotation').first()
    expect(panel.prop('expanded')).toEqual(false)
    const createButton = wrapper.find('button[data-analytics-name="toggle-create-annotation"]').first()
    createButton.simulate('click')
    panel = wrapper.find('Panel.create-annotation').first()
    expect(panel.prop('expanded')).toEqual(true)
  })
})
