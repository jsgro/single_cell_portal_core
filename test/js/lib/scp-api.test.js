// Without disabling eslint code, Promises are auto inserted
/* eslint-disable*/

const fetch = require('node-fetch')
import scpApi, { fetchAuthCode, fetchFacetFilters, mergeReviewerSessionParam } from 'lib/scp-api'

describe('JavaScript client for SCP REST API', () => {
  beforeAll(() => {
    global.fetch = fetch
  })
  // Note: tests that mock global.fetch must be cleared after every test
  afterEach(() => {
    // Restores all mocks back to their original value
    jest.restoreAllMocks()
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

  it('merges reviewerSession parameter when present', async () => {
    const reviewerSession = '1e457ce9-ce9c-4ee9-b772-67e6ce970e73'
    let baseUrl = 'https://localhost:3000/single_cell/study/SCP1'
    let mergedUrl = mergeReviewerSessionParam(baseUrl, reviewerSession)
    expect(mergedUrl).toContain(`?reviewerSession=${reviewerSession}`)
    baseUrl += '?cluster=foo'
    mergedUrl = mergeReviewerSessionParam(baseUrl, reviewerSession)
    expect(mergedUrl).toContain(`&reviewerSession=${reviewerSession}`)
    mergedUrl = mergeReviewerSessionParam(baseUrl, null)
    expect(mergedUrl).toEqual(baseUrl)
  })
})
