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
  const type = 'text-foo/plain-bar'
  readLinesAndType.mockImplementation(() => Promise.resolve({ lines, type }))

  return readLinesAndType
}

describe('Client-side file validation', () => {
  it('catches and logs errors via library interface', async () => {
    const mockPath = `${mockDir}/metadata_example_bad_TYPE.txt`

    mockReadLinesAndType(mockPath)

    const file = {
      name: 'metadata_example_bad_TYPE.txt',
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
        'fileName': 'metadata_example_bad_TYPE.txt',
        'fileSize': 566,
        'fileMimeType': 'text/plain',
        'status': 'failure',
        'summary': 'Your metadata file had 1 error',
        'numErrors': 1,
        'errors': [
          'Second row, first column must be "TYPE" (case insensitive). Provided value was "notTYPE".'
        ]
      }
    )
  })

  it('catches duplicate headers', async () => {
    const mockPath = `${mockDir}/dup_headers.tsv`
    mockReadLinesAndType(mockPath)

    const file = {
      name: 'dup_headers.tsv',
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

  it('catches header errors', async () => {
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

  it('renders validation alert', async () => {
    const summary = 'Your metadata file had 1 error'

    // This error structure matches that in Ingest Pipeline.
    // Such consistency across codebases eases QA and debugging.
    const errors = [
      [
        'error',
        'format',
        'Second row, first column must be "TYPE" (case insensitive). Provided value was "notTYPE".'
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
