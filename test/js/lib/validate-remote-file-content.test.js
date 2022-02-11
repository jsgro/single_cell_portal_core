/**
 * @fileoverview Tests for client-side file validation (CSFV) for sync
 */

import util from 'util'

import fetch, { Headers } from 'node-fetch'
import '@testing-library/jest-dom/extend-expect'

import {
  validateRemoteFileContent,
  MAX_SYNC_CSFV_BYTES, updateSyncProps, getFileFromRangeData
} from 'lib/validation/validate-remote-file-content'

describe('Client-side file validation for sync', () => {
  beforeAll(() => {
    global.fetch = fetch
    global.Headers = Headers
  })

  it('sends Range request for remote file', async () => {
    const fakeLog = jest.spyOn(global, 'fetch')
    fakeLog.mockImplementation(() => { })

    window.SCP = {
      readOnlyToken: 'test'
    }

    const bucketName = 'broad-singlecellportal-public'
    const fileName =
        encodeURIComponent('test/DATA_MATRIX_LOG_TPM_mismatch_columns.txt')
    const fileType = 'Expression Matrix'
    const fileOptions = {}

    try {
      await validateRemoteFileContent(
        bucketName, fileName, fileType, fileOptions
      )
    } catch (error) {
      // Pass over.  Throws error due to inconsitency between `node-fetch`
      // and browser fetch handling of Range responses.
      error
    }

    // This file actually exists at the URL.  It might be useful for a later
    // integration test, which would be more robust to internal refactoring,
    // and more precise (sensitive/specific) of a test.
    const expectedUrl =
        'https://storage.googleapis.com/download/storage/v1/b/' +
        'broad-singlecellportal-public/o/' +
        'test%2FDATA_MATRIX_LOG_TPM_mismatch_columns.txt?alt=media'

    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      {
        headers: new Headers({
          'Range': [`bytes=0-${MAX_SYNC_CSFV_BYTES}`],
          'Authorization': ['Bearer test']
        }),
        method: 'GET'
      }
    )
  })

  it('updates syncProps as needed for logging', async () => {
    let syncProps = { 'perfTime:readRemote': 123456789 }
    const contentRange = `bytes 0-${MAX_SYNC_CSFV_BYTES}/213832273`
    const contentLength = '52428801'

    syncProps = updateSyncProps(contentRange, contentLength, syncProps)

    const expectedSyncProps = {
      'perfTime:readRemote': 123456789,
      'fileSizeFetched': 52428801,
      'fileSizeTotal': 213832273,
      'fetchedCompleteFile': false
    }

    expect(syncProps).toEqual(expectedSyncProps)
  })

  it('makes File with clean lines from incomplete content ', async () => {
    // Range request content can be an incomplete copy of the remote file's
    // content.  In such cases, we need to truncate the last line, which is
    // incomplete, to avoid false positive validation errors.

    const syncProps = { 'fetchedCompleteFile': false }
    const cleanContent =
      'Foo\tBar\tBaz\n' +
      'This\tline\tis\complete'
    const fetchedContent =`${cleanContent}\nThis\tline\tis\incomple`
    const fileName = 'very_big_file.txt'
    const contentType = 'text/plain'

    // Size in bytes
    const cleanContentFileSize =
      (new util.TextEncoder().encode(cleanContent)).length

    const file = getFileFromRangeData(
      fetchedContent, fileName, contentType, syncProps
    )

    // Ensure file size matches size of clean content, rather than (larger)
    // size of fetched content that was passed into getFileFromRangeData
    expect(file.size).toEqual(cleanContentFileSize)
  })
})
