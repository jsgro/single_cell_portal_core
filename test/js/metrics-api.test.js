// Without disabling eslint code, Promises are auto inserted
/* eslint-disable*/

const fetch = require('node-fetch')

import {logClick, setMetricsApiMockFlag} from 'lib/metrics-api'
import * as UserProvider from 'providers/UserProvider'

describe('Library for client-side usage analytics', () => {
  beforeAll(() => {
    global.fetch = fetch
    setMetricsApiMockFlag(true)
  })
  // Note: tests that mock global.fetch must be cleared after every test
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
  })

  it('includes `authenticated: true` when signed in', done => {
    // Spy on `fetch()` and its contingent methods like `json()`,
    // because we want to intercept the outgoing request
    const mockSuccessResponse = {}
    const mockJsonPromise = Promise.resolve(mockSuccessResponse)
    const mockFetchPromise = Promise.resolve({
      json: () => {
        mockJsonPromise
      }
    })
    jest.spyOn(global, 'fetch').mockImplementation(() => {
      mockFetchPromise
    })

    // Mock the user context, to mimic auth'd state
    const userContext = { accessToken: 'test' }
    jest.spyOn(UserProvider, 'useContextUser')
      .mockImplementation(() => {
        return userContext
      })

    const event = {
      target: {
        localName: 'a',
        text: 'Text that is linked'
      }
    }
    logClick(event)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(), // URL
      expect.objectContaining({
        body: expect.stringContaining(
          '\"authenticated\":true'
        )
      })
    )
    process.nextTick(() => {
      done()
    })
  })
})
