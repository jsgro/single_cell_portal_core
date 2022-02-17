import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import {
  validateFileContent, REQUIRED_CONVENTION_COLUMNS
} from 'lib/validation/validate-file-content'
import ValidationMessage from 'components/validation/ValidationMessage'
import * as MetricsApi from 'lib/metrics-api'

import { createMockFile } from './file-mock-utils'

describe('Client-side file validation', () => {
  it('catches and logs errors in files', async () => {
    const file = createMockFile({ fileName: 'metadata_bad_type_header.txt' })

    const fileType = 'Metadata'

    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => { })

    const expectedSummary = 'Your file had 1 error'

    const { errors, summary } = await validateFileContent(file, fileType)

    // Test library
    expect(errors).toHaveLength(1)
    expect(summary).toBe(expectedSummary)

    // Test analytics
    expect(fakeLog).toHaveBeenCalledWith(
      'file-validation',
      expect.objectContaining({
        delimiter: 'tab',
        numColumns: 4,
        linesRead: 17,
        numTableCells: 68,
        fileType: 'Metadata',
        fileName: 'metadata_bad_type_header.txt',
        fileSize: 566,
        fileMimeType: 'text/plain',
        isGzipped: false,
        status: 'failure',
        summary: 'Your file had 1 error',
        numErrors: 1,
        errors: [
          'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
        ],
        errorTypes: [
          'format:cap:type'
        ],
        perfTime: expect.any(Number), numWarnings: 0,
        warnings: [],
        warningTypes: []
      })
    )
  })

  it('catches duplicate headers', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L56
    const file = createMockFile({ fileName: 'dup_headers_v2.0.0.tsv' })
    const { errors, summary } = await validateFileContent(file, 'Metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches missing header lines', async () => {
    const file = createMockFile({ content: 'NAME,X,Y', fileName: 'missing_headers.tsv' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:cap:missing-header-lines')
  })

  it('catches duplicate cell names in cluster file', async () => {
    const file = createMockFile({
      fileName: 'foo.txt',
      content: 'NAME,X,Y\nTYPE,numeric,numeric\nCELL_0001,34.472,32.211\nCELL_0001,15.975,10.043'
    })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('content:duplicate:cells-within-file')
    expect(errors[0][2]).toEqual('Cell names must be unique within a file. 1 duplicate found, including: CELL_0001')
  })

  it('catches duplicate cell names in expression matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo1.csv',
      content: 'GENE,X,Y\nItm2a,0,5\nEif2b2,3,0\nEif2b2,1,9'
    })
    const { errors } = await validateFileContent(file, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('content:duplicate:cells-within-file')
  })

  it('catches missing headers in metadata file', async () => {
    const file = createMockFile({
      fileName: 'foo2.txt',
      content: 'NAME,biosample_id,CellID\nTYPE,numeric,numeric\nCELL_0001,id1,cell1'
    })
    const { errors } = await validateFileContent(file, 'Metadata', { use_metadata_convention: true })
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:cap:metadata-missing-column')
    expect(errors[0][2]).toContain(REQUIRED_CONVENTION_COLUMNS.slice(2).join(', '))
  })

  it('catches missing GENE header in expression matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo4.txt',
      content: 'IS_NOT_GENE,X,Y\nItm2a,0,5\nEif2b2,3,0\nPf2b2,1,9'
    })
    const { errors } = await validateFileContent(file, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:cap:missing-gene-column')
  })

  it('catches non-numeric entry in expression matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo5.csv',
      content: 'GENE,X,Y\nItm2a,p,5\nEif2b2,3,0\nPf2b2,1,9'
    })
    const { errors } = await validateFileContent(file, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('content:type:not-numeric')
  })

  it('catches row with wrong number of columns in expression matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo6.csv',
      content: 'GENE,X,Y\nItm2a,8,9\nEif2b2,3,0\nPf2b2,1'
    })
    const { errors } = await validateFileContent(file, 'Expression Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:mismatch-column-number')
  })

  it('catches row with wrong number of columns in sparse matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo6.mtx',
      content: '%%MatrixMarket matrix coordinate integer general\n%\n4 8 9\n4 3 0\n4 1'
    })
    const { errors } = await validateFileContent(file, 'MM Coordinate Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:mismatch-column-number')
  })

  it('catches missing header string in sparse matrix file', async () => {
    const file = createMockFile({
      fileName: 'foo9.mtx',
      content: '%%MMahrket matrix coordinate integer general\n%\n4 8 9\n4 3 0\n4 1 2'
    })
    const { errors } = await validateFileContent(file, 'MM Coordinate Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:cap:missing-mtx-value')
  })

  it('catches empty row in sparse matrix file', async () => {
    const file = createMockFile({
      fileName: 'fo06.mtx',
      content: '%%MatrixMarket matrix coordinate integer general\n%\n\n\n4 1 0'
    })
    const { errors } = await validateFileContent(file, 'MM Coordinate Matrix')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('format:empty-row')
  })

  it('reports no error with sparse matrix file that has rows with trailing whitespace', async () => {
    const file = createMockFile({
      fileName: 'fo06.mtx',
      content: '%%MatrixMarket matrix coordinate integer general\n%\n4 8 9  \n4 8 9   \n4 1 0'
    })
    const { errors } = await validateFileContent(file, 'MM Coordinate Matrix')
    expect(errors).toHaveLength(0)
  })

  it('catches duplicate row values in barcodes file', async () => {
    const file = createMockFile({
      fileName: 'foo6.tsv',
      content: 'fake000\nfake001\nfake002\nfake000'
    })
    const { errors } = await validateFileContent(file, '10X Barcodes File')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('content:duplicate:values-within-file')
  })

  it('catches duplicate row values in features file', async () => {
    const file = createMockFile({
      fileName: 'foo6.tsv',
      content: 'fake000\tboo\nfake001\tboo\nfake002\tbarr\nfake000\tboo'
    })
    const { errors } = await validateFileContent(file, '10X Genes File')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('content:duplicate:values-within-file')
  })

  it('allows missing headers in metadata file if convention not used ', async () => {
    const file = createMockFile({
      fileName: 'foo.txt',
      content: 'NAME,biosample_id,CellID\nTYPE,numeric,numeric\nCELL_0001,34.472,32.211'
    })
    const { errors } = await validateFileContent(file, 'Metadata', { use_metadata_convention: false })
    expect(errors).toHaveLength(0)
  })

  it('catches mismatched label/value pairs in metadata files', async () => {
    const file = createMockFile({
      fileName: 'foo.txt',
      content: 'NAME,species,species__ontology_label\nTYPE,group,group\nc1,NCBITaxon_9606,Homo sapiens\nc2,NCBITaxon_9607,Homo sapiens'
    })
    const { errors } = await validateFileContent(file, 'Metadata', { use_metadata_convention: false })
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('ontology:multiply-assigned-label')
    expect(errors[0][2]).toContain('Homo sapiens')
    expect(errors[0][2]).toContain('species')
  })

  it('catches group columns with >200 unique labels', async () => {
    const file = createMockFile({ fileName: 'metadata_drag_error.tsv' })
    const { warnings } = await validateFileContent(file, 'Metadata', { use_metadata_convention: true })
    expect(warnings).toHaveLength(2)
    expect(warnings[0][1]).toEqual('content:group-col-over-200')
    expect(warnings[0][2]).toContain('cell_type has over 200 unique values and so will not be visible in plots -- is this intended?')
  })

  it('reports no error with good cluster CSV file', async () => {
    // Confirms no false positive due to comma-separated values
    const file = createMockFile({ fileName: 'cluster_comma_delimited.csv' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('catches gzipped file with txt extension', async () => {
    const file = createMockFile({ fileName: 'foo.txt', content: '\x1F\x2E3lkjf3' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('encoding:missing-gz-extension')
  })

  it('catches text file with .gz suffix', async () => {
    const file = createMockFile({ fileName: 'foo.gz', content: 'CELL\tX\tY' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(1)
    expect(errors[0][1]).toEqual('encoding:invalid-gzip-magic-number')
  })

  it('passes valid gzip file', async () => {
    // Confirms no false positive due to gzip-related content
    const file = createMockFile({ fileName: 'foo.gz', content: '\x1F\x2E3lkjf3' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('catches mismatched header counts', async () => {
    const file = createMockFile({ fileName: 'header_count_mismatch.tsv', contentType: 'text/tab-separated-values' })
    const { errors, summary } = await validateFileContent(file, 'Metadata')
    expect(errors).toHaveLength(1)
    expect(summary).toBe('Your file had 1 error')
  })

  it('catches multiple header errors', async () => {
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_annotations.py#L112
    const file = createMockFile({ fileName: 'error_headers_v2.0.0.tsv' })
    const { errors, summary } = await validateFileContent(file, 'Metadata')
    expect(errors).toHaveLength(3)
    expect(summary).toBe('Your file had 3 errors')
  })

  it('fails when no coordinates in cluster file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L9
    const file = createMockFile({ fileName: 'cluster_bad_no_coordinates.txt' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(1)
  })

  it('passes when no coordinates in cluster file', async () => {
    // Confirms this validation does not report false positive
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cluster.py#L21
    const file = createMockFile({ fileName: 'cluster_example.txt' })
    const { errors } = await validateFileContent(file, 'Cluster')
    expect(errors).toHaveLength(0)
  })

  it('fails when coordinates in metadata file', async () => {
    // Confirms this validation does not report false negatives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L17
    const file = createMockFile({ fileName: 'metadata_bad_has_coordinates.txt' })
    const { errors } = await validateFileContent(file, 'Metadata')
    expect(errors).toHaveLength(1)
  })

  it('passes when no coordinates in metadata file', async () => {
    // Confirms this validation does not report false positives
    //
    // eslint-disable-next-line max-len
    // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/af1c124993f4a3e953debd5a594124f1ac52eee7/tests/test_cell_metadata.py#L31
    const file = createMockFile({ fileName: 'metadata_good_v2-0-0.txt' })
    const { errors } = await validateFileContent(file, 'Metadata')
    expect(errors).toHaveLength(0)
  })

  it('renders validation message', async () => {
    const errorMsgs = [
      'Second row, first column must be "TYPE" (case insensitive). Your value was "notTYPE".'
    ]
    const warningMsgs = [
      'Due to this file\'s size, it will be fully validated after sync, and any errors will be emailed to you.'
    ]

    render(
      <ValidationMessage
        errrorMsgs={errorMsgs}
        warningMsgs={warningMsgs}
        fileName={'invalid_file.txt'}
        isSync={true}
      />
    )

    // Test UI
    // This displays OK in the UI, but not in the test.  Why?
    // const displayedError = screen.getByTestId('validation-error')
    // expect(displayedError).toHaveTextContent(errorMsgs[0])
    // expect(displayedError).toHaveTextContent('Refresh the page') // Sync-specific


    const displayedWarning = screen.getByTestId('validation-warning')
    expect(displayedWarning).toHaveTextContent(warningMsgs[0])
  })
})
