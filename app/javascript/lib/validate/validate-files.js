/**
* @fileoverview Validates Single Cell Portal files on the user's computer
*/

/** Get lines and file type from a selected local file */
async function readLinesAndType(file, numLines) {
  return new Promise((resolve, reject) => {
    // Do something with the FileReader object
    const reader = new FileReader()

    reader.onload = function(ev) {
      // Read string from array buffer
      const bufferSlice = ev.target.result.slice(start, nextSlice)
      const enc = new TextDecoder('utf-8')
      const rawString = enc.decode(bufferSlice)
      const lines = rawString.split(/\r?\n/).slice(0, numLines)
      const fileType = file.type
      resolve({ lines, fileType })
    }

    reader.onerror = reject

    // Consider expanding this to stream-read entire file in chunks,
    // while keeping any important bits in a low-memory variable.
    const start = 0
    const sliceSize = 1000 * 1024 // 1 MiB
    const nextSlice = start + sliceSize + 1

    const blob = file.slice(start, nextSlice)

    reader.readAsArrayBuffer(blob)
  })
}

/** Validate a local metadata file */
async function validateMetadata(file) {
  const { lines, fileType } = await readLinesAndType(file, 2)

  console.log('lines', lines)
  console.log('fileType', fileType)

  const table = lines.map(line => line.split(/(,|\t)/))

  console.log('table', table)
}

/** Validate a local file */
export default function validateFile(file, studyFileType) {
  if (studyFileType === 'metadata') {validateMetadata(file)}
}

