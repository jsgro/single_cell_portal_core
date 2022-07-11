// Without disabling eslint code, Promises are auto inserted
/* eslint-disable*/

// const fetch = require('node-fetch')

import CacheMock from 'browser-cache-mock';
import 'isomorphic-fetch';

import scpApi, { fetchSearch, fetchFacetFilters } from 'lib/scp-api'
import * as ServiceWorkerCache from 'lib/service-worker-cache'
import * as SCPContextProvider from '~/providers/SCPContextProvider'

const oldWindowLocation = window.location

describe('JavaScript client for SCP REST API', () => {
  // mocking of window.location, from https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
  delete window.location

  beforeAll(() => {
//     console.log('ok')
//     // mock the global fetch API
// window.fetchResponseFactory = (url) => '<empty></empty>';
// window.originalFetch = window.fetch;
// window.mockFetch = jest.fn((url) =>
//   Promise.resolve({
//     text: () => Promise.resolve(globalThis.fetchResponseFactory(url)),
//     arrayBuffer: () =>
//       Promise.resolve(
//         Buffer.from(globalThis.fetchResponseFactory(url), 'utf-8')
//       ),
//     status: 200,
//     ok: true,
//     headers: { get: () => null },
//   })
// );
// window.fetch = window.mockFetch;

    window.location = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(oldWindowLocation),
        assign: {
          configurable: true,
          value: jest.fn(),
        },
      },
    )

    const cacheMock = new CacheMock();

    window.caches =  {
      open: async () => cacheMock,
      ...cacheMock
    };

    window.performance = Object.defineProperties(performance, {
      timing: {
          value: {
              connectStart: now + 1,
              connectEnd: now + 1,
              domComplete: now + 100,
              domContentLoadedEventEnd: now + 50,
              domContentLoadedEventStart: now + 40,
              domInteractive: now + 39,
              domLoading: now + 10,
              domainLookupStart: now + 1,
              domainLookupEnd: now + 1,
              fetchStart: now + 1,
              loadEventEnd: now + 1000,
              loadEventStart: now + 1000,
              navigationStart: now,
              redirectEnd: 0,
              redirectStart: 0,
              requestStart: now + 1,
              responseStart: now + 2,
              responseEnd: now + 30,
              secureConnectionStart: 0,
              unloadEventEnd: 0,
              unloadEventStart: 0
          },
          writable: true
      },
      navigation: {
          value: {
              type: 0
          },
          writable: true
      },
      getEntries: {
          value: () => {
              return [];
          },
          writable: true
      },
      getEntriesByType: {
          value: (type) => {
              return performanceObj.filter(perf => {
                  return perf.entryType === type;
              });
          },
          writable: true
      },
      getEntriesByName: {
          value: () => {
              return [];
          },
          writable: true
      },
      setResourceTimingBufferSize: {
          value: jest.fn(),
          writable: true
      },
      clearResourceTimings: {
          value: jest.fn(),
          writable: true
      }
    })

  })



  // Note: tests that mock global.fetch must be cleared after every test
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
  })

  afterAll(() => {
    // restore `window.location` to the `jsdom` `Location` object
    window.location = oldWindowLocation
  })

  it('includes `Authorization: Bearer` in requests when signed in', done => {
    // Spy on `fetch()` and its contingent methods like `json()`,
    // because we want to intercept the outgoing request
    const mockSuccessResponse = {}
    const mockJsonPromise = Promise.resolve(mockSuccessResponse)
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => {
        mockJsonPromise
      }
    })
    jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)

    fetchFacetFilters('disease', 'tuberculosis')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer test'
        }
      })
    )
    process.nextTick(() => {
      done()
    })
  })

  it('catches 500 errors', async () => {
    expect.assertions(1)
    const mockErrorResponse = {
      json: () => Promise.resolve({
        error: 'Internal Server Error'
      })
    }
    jest
      .spyOn(global, 'fetch')
      .mockReturnValue(Promise.resolve(mockErrorResponse))

    return scpApi('/test/path', {}, false)
      .then(() => {})
      .catch(error => {
        expect(error.message).toEqual('Internal Server Error')
      })
  })

  it('leverages service worker cache on fetch, if cache is enabled', () => {

    const mockSuccessResponse = {}
    const mockJsonPromise = Promise.resolve(mockSuccessResponse)
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => {
        mockJsonPromise
      }
    })
    jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)

    jest
      .spyOn(SCPContextProvider, 'getSCPContext')
      .mockReturnValue({
        isServiceWorkerCacheEnabled: true,
        version: '1.21.0'
      })

    jest
      .spyOn(ServiceWorkerCache, 'fetchServiceWorkerCache')
      // .mockReturnValue({})

    const type =  'study'
    const searchParams = {page: 1, terms: "", facets: {}}
    fetchSearch(type, searchParams)

    const url = 'https://localhost:3000/single_cell/api/v1/search?type=study&page=1'
    const init = {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      }
    }
    expect(ServiceWorkerCache.fetchServiceWorkerCache).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer test'
        }
      })
    )

})

})
