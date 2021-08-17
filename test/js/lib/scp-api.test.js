// Without disabling eslint code, Promises are auto inserted
/* eslint-disable*/

const fetch = require('node-fetch')
import scpApi, { fetchAuthCode, fetchFacetFilters, mergeReviewerSessionParam } from 'lib/scp-api'
const oldWindowLocation = window.location

describe('JavaScript client for SCP REST API', () => {
  // mocking of window.location, from https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
  delete window.location

  beforeAll(() => {
    global.fetch = fetch
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

  it('merges reviewerSession parameter when present', () => {
    const reviewerSession = '1e457ce9-ce9c-4ee9-b772-67e6ce970e73'
    let baseUrl = `https://localhost:3000/single_cell/study/SCP1?reviewerSession=${reviewerSession}`
    window.location.assign(baseUrl)
    let mergedUrl = mergeReviewerSessionParam(baseUrl, reviewerSession)
    expect(mergedUrl).toContain(`?reviewerSession=${reviewerSession}`)
    baseUrl = `https://localhost:3000/single_cell/study/SCP1?cluster=foo&reviewerSession=${reviewerSession}`
    window.location.assign(baseUrl)
    mergedUrl = mergeReviewerSessionParam(baseUrl, reviewerSession)
    expect(mergedUrl).toContain(`&reviewerSession=${reviewerSession}`)
    baseUrl = 'https://localhost:3000/single_cell/study/SCP1'
    window.location.assign(baseUrl)
    mergedUrl = mergeReviewerSessionParam(baseUrl, null)
    expect(mergedUrl).toEqual(baseUrl)
  })
})
