/* eslint-disable */
// ESLint unexpectedly converts use `done` in `it` to a Promise, so disable it

import React from 'react'
import { mount } from 'enzyme'
// import { act } from 'react-dom/test-utils';

const fetch = require('node-fetch')

import DownloadButton from 'components/search/controls/DownloadButton'
import { UserContext } from 'providers/UserProvider'

import { DownloadContext } from 'providers/DownloadProvider'
import { StudySearchContext } from 'providers/StudySearchProvider'


describe('Download components for faceted search', () => {
  beforeAll(() => {
    global.fetch = fetch
  })

  it('shows Download button', async () => {
    const wrapper = mount((
      <UserContext.Provider value={{ accessToken: 'test'}}>
        <StudySearchContext.Provider value={ studyContext }>
          <DownloadContext.Provider value={{downloadSize: 40, isLoaded: true}}>
            <DownloadButton/>
          </DownloadContext.Provider>
        </StudySearchContext.Provider>
      </UserContext.Provider>
    ))
    expect(wrapper.find('DownloadButton')).toHaveLength(1)
  })

  it('shows expected tooltip for unauthenticated users', async () => {
    const wrapper = mount((
      <UserContext.Provider value={{ accessToken: ''}}>
        <StudySearchContext.Provider value={ studyContext }>
          <DownloadContext.Provider value={{downloadSize: 40, isLoaded: true}}>
            <DownloadButton/>
          </DownloadContext.Provider>
        </StudySearchContext.Provider>
      </UserContext.Provider>
    ))

    wrapper.find('#download-button > span').simulate('mouseenter')

    const tooltipHint =
      wrapper.find('OverlayTrigger').prop('overlay').props['children']

    expect(tooltipHint).toBe('To download, please sign in')
  })

  // TODO (SCP-2333): Restore test for showing modal upon clicking Download button
  // it('shows modal upon clicking Download button', done => {
  //   const wrapper = mount(<DownloadButton />)

  //   // To consider: Having to call "wrapper.find('Modal').first()" is tedious,
  //   // but assigning it to a variable fails to capture updates.  Find a
  //   // more succinct approach that captures updates.
  //   expect(wrapper.find('Modal').first().prop('show')).toEqual(false)
  //   // act(() => {
  //     wrapper.find('#download-button > span').simulate('click')
  //     console.log('in download.test.js, after click')
  //     // wrapper.update();

  //     expect(wrapper.find('Modal').first().prop('show')).toEqual(true)
  //     console.log('in download.test.js, done')
  //     done()
  //   // })
  // })
})
