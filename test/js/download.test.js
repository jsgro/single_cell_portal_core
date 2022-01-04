/* eslint-disable */
// ESLint unexpectedly converts use `done` in `it` to a Promise, so disable it

import React from 'react'
import { mount } from 'enzyme'
// import { act } from 'react-dom/test-utils';

const fetch = require('node-fetch')

import DownloadButton from 'components/search/controls/download/DownloadButton'
import { UserContext } from 'providers/UserProvider'


describe('Download components for faceted search', () => {
  beforeAll(() => {
    global.fetch = fetch
  })

  // Note: tests that mock global.fetch must be cleared after every test
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
  })

  it('shows expected tooltip for unauthenticated users', async () => {
    const wrapper = mount((
      <UserContext.Provider value={{ accessToken: ''}}>
        <DownloadButton searchResults={{ matchingAccessions: ['SCP1', 'SCP2'], terms: 'foo', facets: [] }}/>
      </UserContext.Provider>
    ))
    expect(wrapper.find('DownloadButton')).toHaveLength(1)
    expect(wrapper.find('#download-button').prop('disabled')).toEqual(true)
    wrapper.find('#download-button > span').simulate('mouseenter')
    const tooltipHint = wrapper.find('OverlayTrigger').prop('overlay').props['children']
    expect(tooltipHint).toBe('To download, please sign in')
  })

  it('shows expected tooltip if no search has been performed', async () => {
    const wrapper = mount((
      <UserContext.Provider value={{ accessToken: 'test'}}>
        <DownloadButton searchResults={{ matchingAccessions: ['SCP1', 'SCP2'], terms: '', facets: [] }}/>
      </UserContext.Provider>
    ))
    expect(wrapper.find('#download-button').prop('disabled')).toEqual(true)
    wrapper.find('#download-button > span').simulate('mouseenter')
    const tooltipHint = wrapper.find('OverlayTrigger').prop('overlay').props['children']

    expect(tooltipHint).toBe('To download, first do a valid search')
  })

  it('is enabled and shows the modal for signed in users who perform a search', async () => {
    // mock request to prevent TypeError: response.json is not a function error
    const mockSuccessResponse = {}
    const mockJsonPromise = Promise.resolve(mockSuccessResponse)
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => {
        mockJsonPromise
      }
    })
    jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)

    const wrapper = mount((
      <UserContext.Provider value={{ accessToken: 'test'}}>
        <DownloadButton searchResults={{ matchingAccessions: ['SCP1', 'SCP2'], terms: 'foo', facets: [] }}/>
      </UserContext.Provider>
    ))
    expect(wrapper.find('#download-button').prop('disabled')).toEqual(false)
    wrapper.find('#download-button').simulate('click')
    expect(wrapper.find('DownloadSelectionModal')).toHaveLength(1)
  })
})
