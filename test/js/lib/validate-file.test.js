import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as Io from 'lib/validation/io'
import * as ValidateFile from 'lib/validation/validate-file'
import ValidationAlert from 'components/validation/ValidationAlert'
import * as MetricsApi from 'lib/metrics-api'

const fs = require('fs')

const mockDir = 'public/mock_data/validation'

/** Mock function that uses FileReader, which isn't available in Node */
function mockReadLinesAndType(mockPath) {
  const fileContent = fs.readFileSync(mockPath, 'utf8')

  /** Mock function that uses FileReader, which isn't available in Node */
  const readLinesAndType = jest.spyOn(Io, 'readLinesAndType')
  const lines = fileContent.split(/\r?\n/).slice()
  const mimeType = 'text/tab-separated-values'
  readLinesAndType.mockImplementation(() => Promise.resolve({ lines, mimeType }))

  return readLinesAndType
}

describe('Client-side file validation', () => {
  it('catches and logs errors via library interface', async () => {
    const mockPath = `${mockDir}/metadata_bad_type_header.txt`

    mockReadLinesAndType(mockPath)

    const file = {
      name: 'metadata_bad_type_header.txt',
      size: 566,
      type: 'text/plain'
    }
    const fileType = 'metadata'

    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => {})

    const expectedSummary = 'Your metadata file had 1 error'

    const { errors, summary } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(1)
    expect(summary).toBe(expectedSummary)

    // Test analytics
    expect(fakeLog).toHaveBeenCalledWith(
      'file-validation',
      {
        'fileType': 'metadata',
        'fileName': 'metadata_bad_type_header.txt',
        'fileSize': 566,
        'fileMimeType': 'text/plain',
        'status': 'failure',
        'summary': 'Your metadata file had 1 error',
        'numErrors': 1,
        'errors': [
          'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
        ]
      }
    )
  })

  it('catches duplicate headers', async () => {
    const mockPath = `${mockDir}/dup_headers_v2.0.0.tsv`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'dup_headers_v2.0.0.tsv',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'metadata'

    const expectedSummary = 'Your metadata file had 1 error'

    const { errors, summary } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(1)
    expect(summary).toBe(expectedSummary)
  })

  it('catches mismatched header counts', async () => {
    const mockPath = `${mockDir}/header_count_mismatch.tsv`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'header_count_mismatch.tsv',
      size: 555,
      type: 'text/tab-separated-values'
    }
    const fileType = 'metadata'

    const expectedSummary = 'Your metadata file had 1 error'

    const { errors, summary } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(1)
    expect(summary).toBe(expectedSummary)
  })

  it('catches multiple header errors', async () => {
    const mockPath = `${mockDir}/error_headers_v2.0.0.tsv`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'error_headers_v2.0.0.tsv',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'metadata'

    const expectedSummary = 'Your metadata file had 3 errors'

    const { errors, summary } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(3)
    expect(summary).toBe(expectedSummary)
  })

  it('reports error for true positive of no coordinates in cluster file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L9
    const mockPath = `${mockDir}/cluster_bad_no_coordinates.txt`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'cluster_bad_no_coordinates.txt',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'cluster'

    const { errors } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(0)
  })

  it('reports no error for true negative of no coordinates in cluster file', async () => {
    // Confirms this validation does not report false positive
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L21
    const mockPath = `${mockDir}/cluster_example.txt`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'cluster_example.txt',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'cluster'

    const { errors } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(0)
  })

  it('reports error for true positive of coordinates in metadata file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L17
    const mockPath = `${mockDir}/metadata_bad_has_coordinates.txt`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'metadata_bad_has_coordinates.txt',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'cluster'

    const { errors } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(0)
  })

  it('reports no error for true negative of coordinates in metadata file', async () => {
    // Confirms this validation does not report false positives
    //
    // eslint-disable-next-line max-len
    // https:// github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L31
    const mockPath = `${mockDir}/metadata_example.txt`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'metadata_example.txt',
      size: 555,
      type: 'text/plain'
    }
    const fileType = 'cluster'

    const { errors } = await ValidateFile.validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(0)
  })

  it('renders validation alert', async () => {
    const summary = 'Your metadata file had 1 error'

    // This error structure matches that in Ingest Pipeline.
    // Such consistency across codebases eases QA and debugging.
    const errors = [
      [
        'error',
        'format',
        'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
      ]
    ]
    const fileType = 'metadata'

    render(
      <ValidationAlert
        summary={summary}
        errors={errors}
        fileType={fileType}
      />
    )

    // Test UI
    const alert = screen.getByTestId('metadata-validation-alert')
    const expectedContent = `${summary}:${errors[0][2]}`
    expect(alert).toHaveTextContent(expectedContent)
  })
})
