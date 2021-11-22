import * as Io from 'lib/validation/io'
const fs = require('fs')
import { fireEvent } from '@testing-library/react'

const mockDir = 'test/test_data/validation/'

/** Mock function that uses FileReader, which is not available in Node.
 * mocks in the provided content
 *  if fileName is provided, this attempts to read the file
 * from the `mockDir` specified above */
export function mockReadLinesAndType({ content, fileName }) {
  if (fileName) {
    content = fs.readFileSync(mockDir + fileName, 'utf8')
  }

  const readLinesAndType = jest.spyOn(Io, 'readLinesAndType')
  const lines = content.split(/\r?\n/).slice()
  const mimeType = 'text/tab-separated-values'
  readLinesAndType.mockImplementation(() => Promise.resolve({ lines, mimeType }))

  return readLinesAndType
}

/** Mock function that uses FileReader, which is not available in Node.
 * mocks in the provided content
 *  if fileName is provided, this attempts to read the file
 * from the `mockDir` specified above */
export function mockCatchDuplicateCellNames({ content, fileName }) {
  if (fileName) {
    content = fs.readFileSync(mockDir + fileName, 'utf8')
  }

  const catchDuplicateCellNames = jest.spyOn(Io, 'catchDuplicateCellNames')
  const lines = content.split(/\r?\n/).slice()
  const cellNames = new Set()
  const duplicates = new Set()

  for (let line = 0; line < lines.length-1; line++) {
    const cell = lines[line].toString().split(/[,\t]/gm)[0].trim()
    if (cellNames.has(cell)) {
      duplicates.add(cell)
    } else {
      cellNames.add(cell)
    }
  }
  if (duplicates.size >= 1) {
    catchDuplicateCellNames.mockImplementation(() => Promise.reject(new Error([...duplicates].join(', '))))
  } else {
    catchDuplicateCellNames.mockImplementation(() => Promise.resolve('success'))

  }

  return catchDuplicateCellNames
}


/** simulates a user selecting a file with the given information
 *  returns the js File object created.
 *   If mockIO is true, it will call mockReadLinesAndType with the given file content */
export function fireFileSelectionEvent(node, {
  fileName,
  content='text stuff',
  contentType='text/plain'
}, mockIO=true) {
  const selectedFile = new File([content], fileName, { type: contentType })
  if (mockIO) {
    mockReadLinesAndType({ content })
  }
  fireEvent.change(node, { target: { files: [selectedFile] } })
  return selectedFile
}
