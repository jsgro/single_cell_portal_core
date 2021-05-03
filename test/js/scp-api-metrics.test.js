// Without disabling eslint code, Promises are auto inserted
/* eslint-disable*/

import {calculatePerfTimes} from 'lib/metrics-api'

describe('Helper library for client-side usage analytics', () => {
  beforeAll(() => {
    setMetricsApiMockFlag(true)
  })
  // Note: tests that mock global.fetch must be cleared after every test
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.resetAllMocks();
  })

  it('calculates perfTime values correctly', done => {
    // Spy on `fetch()` and its contingent methods like `json()`,
    // because we want to intercept the outgoing request
    // const mockSuccessResponse = {}
    // const mockJsonPromise = Promise.resolve(mockSuccessResponse)
    // const mockFetchPromise = Promise.resolve({
    //   json: () => {
    //     mockJsonPromise
    //   }
    // })
    // jest.spyOn(global, 'fetch').mockImplementation(() => {
    //   mockFetchPromise
    // })

    const url = "https://localhost:3000/single_cell/api/v1/studies/SCP42/clusters/_default?"

    const mockPerfEntry = {
      connectEnd: 1000.519999971613,
      connectStart: 1000.519999971613,
      decodedBodySize: 379216,
      domainLookupEnd: 1000.519999971613,
      domainLookupStart: 1000.519999971613,
      duration: 1962.8150000353344,
      encodedBodySize: 90138,
      entryType: "resource",
      fetchStart: 1000.519999971613,
      initiatorType: "fetch",
      name: url, // Same URL as that in mockPerfTimes
      nextHopProtocol: "http/1.1",
      redirectEnd: 0,
      redirectStart: 0,
      requestStart: 1002.420000003651,
      responseEnd:  2963.335000006948,
      responseStart: 2960.079999960028,
      secureConnectionStart: 1000.519999971613,
      serverTiming: [],
      startTime: 1000.519999971613,
      transferSize: 90983,
      workerStart: 0,
      workerTiming: []
    },

    jest.spyOn(global, 'performance').mockImplementation(() => {
      getEntriesByType: function(type) { // eslint-disable-line
        return [
          {name: 'decoy1'},
          mockPerfEntry,
          {name: 'decoy2'},
          {name: 'decoy3'}
        ]
      }
    })

    const mockPerfTimes = {
      url: 'https://localhost:3000/single_cell/api/v1/studies/SCP42/clusters/_default?',
      legacy: 1968.8150000353344
    }
    targetWrapper.find('a').simulate('click')

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

  it('logs text of selected option on changing in menu', done => {
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

    const event = {
      target: {
        options: {
          0: {text: 'Yes'},
          1: {text: 'No'},
          selectedIndex: 1
        }
      }
    }
    logMenuChange(event)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(), // URL
      expect.objectContaining({
        body: expect.stringContaining(
          '\"text\":\"No\"'
        )
      })
    )
    process.nextTick(() => {
      global.fetch.mockClear();
      done()
    })
  })

  it('logs classList and id when link is clicked', done => {
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

    const target = {
        classList: ['class-name-1', 'class-name-2'],
        innerText: 'dif Text that is linked',
        id: "link-id",
        dataset: {},
    }
    logClickLink(target)

    let expected = '\"text\":\"dif Text that is linked\",\"classList\":[\"class-name-1\",\"class-name-2\"],\"id\":\"link-id\"'
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(), // URL
      expect.objectContaining({
        body: expect.stringContaining(
          expected
        )
      })
    )
    process.nextTick(() => {
      done()
    })
  })
})
