import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import * as Io from 'lib/validation/io'
import { validateFile } from 'lib/validation/validate-file'
import ValidationAlert from 'components/validation/ValidationAlert'
import * as MetricsApi from 'lib/metrics-api'

const fs = require('fs')

const mockDir = 'test/test_data/validation/'

/** Mock function that uses FileReader, which is not available in Node */
function mockReadLinesAndType(mockFileName) {
  const fileContent = fs.readFileSync(mockDir + mockFileName, 'utf8')

  const readLinesAndType = jest.spyOn(Io, 'readLinesAndType')
  const lines = fileContent.split(/\r?\n/).slice()
  const mimeType = 'text/tab-separated-values'
  readLinesAndType.mockImplementation(() => Promise.resolve({ lines, mimeType }))

  return readLinesAndType
}

describe('Client-side file validation', () => {
  it('catches and logs errors via library interface', async () => {
    mockReadLinesAndType('metadata_bad_type_header.txt')

    const file = {
      name: 'metadata_bad_type_header.txt',
      size: 566,
      type: 'text/plain'
    }
    const fileType = 'metadata'

    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => {})

    const expectedSummary = 'Your metadata file had 1 error'

    const { errors, summary } = await validateFile(file, fileType)

    // Test library
    expect(errors).toHaveLength(1)
    expect(summary).toBe(expectedSummary)

    // Test analytics
    expect(fakeLog).toHaveBeenCalledWith(
      'file-validation',
      {
        'delimiter': 'tab',
        'numColumns': 4,
        'numRows': 17,
        'numTableCells': 68,
        'fileType': 'metadata',
        'fileName': 'metadata_bad_type_header.txt',
        'fileSize': 566,
        'fileMimeType': 'text/plain',
        'status': 'failure',
        'summary': 'Your metadata file had 1 error',
        'numErrors': 1,
        'errors': [
          'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
        ],
        'errorTypes': [
          'format:header:type'
        ]
      }
    )
  })

  it('catches duplicate headers', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L56
    mockReadLinesAndType('dup_headers_v2.0.0.tsv')
    const { errors, summary } = await validateFile({}, 'metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your metadata file had 1 error')
  })

  it('reports no error with good cluster CSV file', async () => {
    // Confirms no false positive due to comma-separated values
    mockReadLinesAndType('cluster_comma_delimited.csv')
    const { errors } = await validateFile({}, 'cluster')
    expect(errors).toHaveLength(0)
  })

  it('catches mismatched header counts', async () => {
    mockReadLinesAndType('header_count_mismatch.tsv')
    const { errors, summary } = await validateFile({}, 'metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your metadata file had 1 error')
  })

  it('catches multiple header errors', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L112
    mockReadLinesAndType('error_headers_v2.0.0.tsv')
    const { errors, summary } = await validateFile({}, 'metadata')
    expect(errors).toHaveLength(3)
    expect(summary).toBe('Your metadata file had 3 errors')
  })

  it('reports error for true positive of no coordinates in cluster file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L9
    mockReadLinesAndType('cluster_bad_no_coordinates.txt')
    const { errors } = await validateFile({}, 'cluster')
    expect(errors).toHaveLength(0)
  })

  it('reports no error for true negative of no coordinates in cluster file', async () => {
    // Confirms this validation does not report false positive
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L21
    mockReadLinesAndType('cluster_example.txt')
    const { errors } = await validateFile({}, 'cluster')
    expect(errors).toHaveLength(0)
  })

  it('reports error for true positive of coordinates in metadata file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L17
    mockReadLinesAndType('metadata_bad_has_coordinates.txt')
    const { errors } = await validateFile({}, 'metadata')
    expect(errors).toHaveLength(0)
  })

  it('reports no error for true negative of coordinates in metadata file', async () => {
    // Confirms this validation does not report false positives
    //
    // eslint-disable-next-line max-len
    // Mirrors https:// github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L31
    mockReadLinesAndType('metadata_example.txt')
    const { errors } = await validateFile({}, 'metadata')
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
