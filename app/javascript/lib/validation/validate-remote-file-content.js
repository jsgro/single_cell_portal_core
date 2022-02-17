/**
* @fileoverview Client-side file validation (CSFV) for sync
*/

import { log } from 'lib/metrics-api'
import { parseFile, getLogProps } from './validate-file-content'
import { fetchBucketFile } from 'lib/scp-api'

/**
 * 50 MiB, max number of bytes to read and validate from remote file for sync.
 * Median fixed US bandwidth is 16 MiB/s (17 MB/s, 136 Mbps) as of 2021-12
 * per https://www.speedtest.net/global-index/united-states.  > 80% of ingests
 * are for files <= 50 MiB per https://mixpanel.com/s/3EbFMj.
 *
 * So 50 MiB means sync CSFV fully scans > 80% files, usually in < 5 seconds.
 * Local tests gave 4.6 s (3.4 s remote read, 1.1 s validate; 138 Mbps down).
 */
export const MAX_SYNC_CSFV_BYTES = 50 * 1024 * 1024

/** Get file-size data for sync validation processing and logging */
export function getSizeProps(contentRange, contentLength, file) {
  // Total size of the file in bytes
  let fileSizeTotal

  // Total bytes downloaded, which can be much less than total file size
  let fileSizeFetched

  if (contentRange !== null) {
    fileSizeTotal = parseInt(contentRange.split('/')[1])
    fileSizeFetched = parseInt(contentLength)
  } else {
    fileSizeTotal = file.size
    fileSizeFetched = fileSizeTotal
  }

  const fetchedCompleteFile = (fileSizeTotal === fileSizeFetched)

  return {
    fileSizeFetched,
    fileSizeTotal,
    fetchedCompleteFile
  }
}

/**
 * Validate file in GCS bucket, log and return issues for sync UI
 *
 *  @param {String} bucketName Name of Google Cloud Storage bucket
 *  @param {String} fileName Name of file object in GCS bucket
 *  @param {String} fileType SCP file type
 *  @param {Object} [fileOptions]
 *
 * @return {Object} issueObj Validation results, where:
 *   - `errors` is an array of errors,
 *   - `warnings` is an array of warnings, and
 *   - `summary` is a message like "Your file had 2 errors"
 */
export async function validateRemoteFileContent(
  bucketName, fileName, fileType, fileOptions
) {
  const startTime = performance.now()

  const requestStart = performance.now()
  const response = await fetchBucketFile(bucketName, fileName, MAX_SYNC_CSFV_BYTES)
  const content = await response.text()
  const readRemoteTime = Math.round(performance.now() - requestStart)

  const contentRange = response.headers.get('content-range')
  const contentLength = response.headers.get('content-length')
  const contentType = response.headers.get('content-type')

  const file = new File([content], fileName, { type: contentType })

  const sizeProps = getSizeProps(contentRange, contentLength, file)

  // Equivalent block exists in validateFileContent
  const { fileInfo, issueObj, perfTime } = await parseFile(file, fileType, fileOptions, sizeProps)

  const totalTime = Math.round(performance.now() - startTime)
  const otherProps = Object.assign(
    sizeProps, {
      'perfTime': totalTime,
      'perfTimes:readRemote': readRemoteTime, // Fetch + raw parse
      'perfTimes:parseFile': perfTime, // Processed parse + validate
      'perfTime:other': totalTime - readRemoteTime - perfTime
    }
  )

  const logProps = getLogProps(fileInfo, issueObj, otherProps)
  log('file-validation', logProps)

  return issueObj
}
