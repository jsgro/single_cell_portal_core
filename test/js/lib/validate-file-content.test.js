import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import { validateFileContent } from 'lib/validation/validate-file-content'
import ValidationAlert from 'components/validation/ValidationAlert'
import * as MetricsApi from 'lib/metrics-api'

import { mockReadLinesAndType } from './file-mock-utils'


describe('Client-side file validation', () => {
  it('catches and logs errors via library interface', async () => {
    mockReadLinesAndType({ fileName: 'metadata_bad_type_header.txt' })
    const file = {
      name: 'metadata_bad_type_header.txt',
      size: 566,
      type: 'text/plain'
    }
    const fileType = 'Metadata'

    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => {})

    const expectedSummary = 'Your file had 1 error'

    const { errors, summary } = await validateFileContent(file, fileType)

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
        'fileType': 'Metadata',
        'fileName': 'metadata_bad_type_header.txt',
        'fileSize': 566,
        'fileMimeType': 'text/plain',
        'status': 'failure',
        'summary': 'Your file had 1 error',
        'numErrors': 1,
        'errors': [
          'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
        ],
        'errorTypes': [
          'format:cap:type'
        ]
      }
    )
  })

  it('catches duplicate headers', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L56
    mockReadLinesAndType({ fileName: 'dup_headers_v2.0.0.tsv' })
    const { errors, summary } = await validateFileContent({ name: 'm.txt' }, 'Metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches duplicate cell names in cluster file', async () => {
    mockReadLinesAndType({ content: 'NAME,X,Y\nTYPE,numeric,numeric\nCELL_0001,34.4,32.211\nCELL_0001,15.9,10.04' })
    const { errors, summary } = await validateFileContent({ name: 'dup_cell_names.txt' }, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches duplicate cell names in dense matrix file', async () => {
    mockReadLinesAndType({ content: 'GENE,CELL_0001,CELL_0001\nItm2a,0,0\nSergef,0,7.092' })
    const { errors, summary } = await validateFileContent({ name: 'dup_cell_name.txt' }, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches missing "GENE" entry in dense matrix file', async () => {
    mockReadLinesAndType({ content: 'G,CELL_0001,CELL_0002\nItm2a,0,0\nSergef,0,7.092' })
    const { errors, summary } = await validateFileContent({ name: 'missing_GENE.txt' }, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches non-numeric entry in dense matrix file', async () => {
    mockReadLinesAndType({ content: 'GENE,CELL_0001,CELL_0002\nItm2a,trtr,0\nSergef,0,7.092' })
    const { errors, summary } = await validateFileContent({ name: 'non_numeric.txt' }, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('reports no error with good cluster CSV file', async () => {
    // Confirms no false positive due to comma-separated values
    mockReadLinesAndType({ fileName: 'cluster_comma_delimited.csv' })
    const { errors } = await validateFileContent({ name: 'c.txt' }, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('catches gzipped file with txt extension', async () => {
    mockReadLinesAndType({ content: '\x1F\x2E3lkjf3' })
    const { errors } = await validateFileContent({ name: 'c.txt' }, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('encoding:missing-gz-extension')
  })

  it('catches text file with .gz suffix', async () => {
    mockReadLinesAndType({ content: 'CELL\tX\tY' })
    const { errors } = await validateFileContent({ name: 'c.txt.gz' }, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('encoding:invalid-gzip-magic-number')
  })

  it('passes valid gzip file', async () => {
    // Confirms no false positive due to gzip-related content
    mockReadLinesAndType({ content: '\x1F\x2E3lkjf3' })
    const { errors } = await validateFileContent({ name: 'c.txt.gz' }, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('catches mismatched header counts', async () => {
    mockReadLinesAndType({ fileName: 'header_count_mismatch.tsv' })
    const { errors, summary } = await validateFileContent({ name: 'm.txt' }, 'Metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches multiple header errors', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L112
    mockReadLinesAndType({ fileName: 'error_headers_v2.0.0.tsv' })
    const { errors, summary } = await validateFileContent({ name: 'm.txt' }, 'Metadata')
    expect(errors).toHaveLength(3)
    expect(summary).toBe('Your file had 3 errors')
  })

  it('fails when no coordinates in cluster file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L9
    mockReadLinesAndType({ fileName: 'cluster_bad_no_coordinates.txt' })
    const { errors } = await validateFileContent({ name: 'c.txt' }, 'Cluster')
    expect(errors).toHaveLength(1)
  })

  it('passes when no coordinates in cluster file', async () => {
    // Confirms this validation does not report false positive
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L21
    mockReadLinesAndType({ fileName: 'cluster_example.txt' })
    const { errors } = await validateFileContent({ name: 'c.txt' }, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('fails when coordinates in metadata file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L17
    mockReadLinesAndType({ fileName: 'metadata_bad_has_coordinates.txt' })
    const { errors } = await validateFileContent({ name: 'm.txt' }, 'Metadata')
    expect(errors).toHaveLength(1)
  })

  it('passes when no coordinates in metadata file', async () => {
    // Confirms this validation does not report false positives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L31
    mockReadLinesAndType({ fileName: 'metadata_good_v2-0-0.txt' })
    const { errors } = await validateFileContent({ name: 'm.txt' }, 'Metadata')
    expect(errors).toHaveLength(0)
  })

  it('renders validation alert', async () => {
    const summary = 'Your file had 1 error'

    // This error structure matches that in Ingest Pipeline.
    // Such consistency across codebases eases QA and debugging.
    const errors = [
      [
        'error',
        'format',
        'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
      ]
    ]
    const fileType = 'Metadata'

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
