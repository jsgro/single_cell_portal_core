import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as Io from 'lib/validation/io'
import * as ValidateFile from 'lib/validation/validate-file'
import ValidationAlert from 'components/validation/ValidationAlert'
import * as MetricsApi from 'lib/metrics-api'

const fs = require('fs')

const mockDir = 'public/mock_data/validation'


describe('Client-side file validation', () => {
  it('catches TYPE header errors, works at library interface', async () => {
    const mockPath = `${mockDir}/metadata_example_bad_TYPE.txt`
    const fileContent = fs.readFileSync(mockPath, 'utf8')

    /** Mock function that uses FileReader, which isn't available in Node */
    const readLinesAndType = jest.spyOn(Io, 'readLinesAndType')
    const lines = fileContent.split(/\r?\n/).slice()
    const type = 'text-foo/plain-bar'
    readLinesAndType.mockImplementation(() => Promise.resolve({ lines, type }))

    const errors = await ValidateFile.validateFile(fileContent, 'metadata')

    expect(errors).toHaveLength(1)
  })

  it('renders validation alert, logs error', async () => {
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

    const fakeLog = jest.spyOn(MetricsApi, 'log')
    fakeLog.mockImplementation(() => {})

    render(<ValidationAlert errors={errors} fileType={fileType}/>)

    // Test UI
    const alert = screen.getByTestId('metadata-validation-alert')
    const expectedContent = `Your metadata file had 1 error:${errors[0][2]}`
    expect(alert).toHaveTextContent(expectedContent)

    // Test analytics
    expect(fakeLog).toHaveBeenCalledWith(
      'error:file-validation',
      {
        'fileType': 'metadata',
        'summary': 'Your metadata file had 1 error',
        'numErrors': 1,
        'errors': [
          'Second row, first column must be "TYPE" (case insensitive). Provided value was "notTYPE".'
        ]
      }
    )
  })
})
