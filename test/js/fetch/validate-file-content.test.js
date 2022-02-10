import '@testing-library/jest-dom/extend-expect'
import fetch, { Headers } from 'node-fetch'

import {
  validateRemoteFileContent
} from 'lib/validation/validate-file-content'
import * as MetricsApi from 'lib/metrics-api'
import * as ScpApi from 'lib/scp-api'

// import { createMockFile } from './file-mock-utils'

describe('Client-side file validation', () => {
  beforeAll(() => {
    global.fetch = fetch
    global.Headers = Headers
  })

  it('catches and logs errors in remote files', async () => {
    // const fakeFetchText = jest.spyOn(fetch, 'text')
    // fakeFetchText.mockImplementation(() => { })

    // const mockSuccessResponse = 'mock success response'
    // const mockTextPromise = Promise.resolve(mockSuccessResponse)
    const mockFetchPromise = Promise.resolve({
      ok: fetch.Response.ok,
      headers: fetch.Response.headers,
      text: () => {
        mockTextPromise
      }
    })
    jest.spyOn(global, 'fetch').mockImplementation(() => mockFetchPromise)
    console.log('JSON.stringify(fetch.Response)')
    console.log(JSON.stringify(fetch.Response))
    console.log('JSON.stringify(fetch.Response.Headers)')
    console.log(JSON.stringify(fetch.Response.Headers))

    window.SCP = {
      readOnlyToken: 'mock'
    }

    const bucketName = 'broad-singlecellportal-public'
    const fileName =
      encodeURIComponent('test/DATA_MATRIX_LOG_TPM_mismatch_columns.txt')
    const fileType = 'Expression Matrix'
    const fileOptions = {}

    const results = await validateRemoteFileContent(
      bucketName, fileName, fileType, fileOptions
    )

    console.log('results', results)
    const errorMsgs = results.errors.map(error => error[2])
    expect(errorMsgs).toHaveLength(1)

    // const fakeLog = jest.spyOn(MetricsApi, 'log')
    // fakeLog.mockImplementation(() => { })

    // const expectedSummary = 'Your file had 1 error'

    // const { errors, summary } = await validateFileContent(file, fileType)

    // // Test library
    // expect(errors).toHaveLength(1)
    // expect(summary).toBe(expectedSummary)

    // // Test analytics
    // expect(fakeLog).toHaveBeenCalledWith(
    //   'file-validation',
    //   expect.objectContaining({
    //     delimiter: 'tab',
    //     numColumns: 4,
    //     linesRead: 17,
    //     numTableCells: 68,
    //     fileType: 'Metadata',
    //     fileName: 'metadata_bad_type_header.txt',
    //     fileSize: 566,
    //     fileMimeType: 'text/plain',
    //     isGzipped: false,
    //     status: 'failure',
    //     summary: 'Your file had 1 error',
    //     numErrors: 1,
    //     errors: [
    //       'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
    //     ],
    //     errorTypes: [
    //       'format:cap:type'
    //     ],
    //     perfTime: expect.any(Number), numWarnings: 0,
    //     warnings: [],
    //     warningTypes: []
    //   })
    // )
  })
})
