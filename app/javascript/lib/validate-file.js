/** Read lines from a selected local file */
function readLines(file, numLines) {
  // Do something with the FileReader object
  const reader = new FileReader()

  reader.onload = function(ev) {
    // Read string from array buffer
    const bufferSlice = ev.target.result.slice(start, nextSlice)
    const enc = new TextDecoder('utf-8')
    const rawString = enc.decode(bufferSlice)
    const lines = rawString.split(/\r?\n/)
    const splitLines = lines.map(line => line.split(/(,|\t)/))
    const headers = splitLines.slice(0, 2)
    const typeHeader = headers[1][0]
    if (typeHeader !== 'TYPE') {
      const msg =
        `"TYPE" must be the value of 2nd row, 1st column of a metadata ` +
        `file.  Instead, your file has "${typeHeader}"`
      alert(msg)
    }
  }
  const start = 0
  const sliceSize = 1000 * 1024 // 1 MiB
  const nextSlice = start + sliceSize + 1
  const blob = file.slice(start, nextSlice)

  reader.readAsArrayBuffer(blob)
}

/** Validate a local metadata file */
function validateMetadata(file) {
  readLines(file)
}

/** Validate a local file */
export default function validateFile(file, studyFileType) {
  if (studyFileType === 'metadata') {validateMetadata(file)}
}

