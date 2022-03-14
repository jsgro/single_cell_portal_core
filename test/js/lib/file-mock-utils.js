import * as Io from 'lib/validation/io'
const fs = require('fs')
import { fireEvent } from '@testing-library/react'
import { gunzipSync, strFromU8 } from 'fflate'


/** creates a File object with the given content and/or filename.  If no content is specified,
 * it will attempt to read the file from the filesystem.
 * We have to mock readFileBytes since blob.arrayBuffer() is not supported in nodejs
*/
export function createMockFile({
  content, fileName, contentType='text/plain', filePath='test/test_data/validation/', mockIO=true
}) {
  if (typeof content === 'undefined') {
    content = fs.readFileSync(filePath + fileName, 'utf8')
  }
  if (mockIO) {
    const readFileSpy = jest.spyOn(Io, 'readFileBytes')
    readFileSpy.mockImplementation((_file, startByte, chunkSize=Io.DEFAULT_CHUNK_SIZE, isGzipped=false) => {
      if (!isGzipped) {
        return content.slice(startByte, startByte + chunkSize)
      } else {
        content = fs.readFileSync(filePath + fileName)
        const gunzippedContent = strFromU8(gunzipSync(content))
        return gunzippedContent
      }
    })
  }
  return new File([content], fileName, { type: contentType })
}

/** simulates a user selecting a file with the given information
 *  returns the js File object created.
 *   If mockIO is true, it will call mockReadLinesAndType with the given file content */
export function fireFileSelectionEvent(node, {
  fileName,
  content='text stuff',
  contentType='text/plain'
}, mockIO=true) {
  const file = createMockFile({ content, fileName, contentType }, mockIO)
  fireEvent.change(node, { target: { files: [file] } })
  return file
}
