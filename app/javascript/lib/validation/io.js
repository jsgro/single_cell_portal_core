/**
 * @fileoverview Input and output (IO) functions for SCP file validation
 *
 * To automatically test `validate-file.js` without strange workarounds [1],
 * any function calling FileReader (e.g. readLinesAndType) must be imported
 * from a separate module than `validate-file.js`.  This was the original
 * motivation to extract this function to its own module.
 *
 * [1] https://stackoverflow.com/a/47976589
*/
/** Get lines and file type from a selected local file */
export async function readLinesAndType(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = function(ev) {
      // Read string from array buffer
      const bufferSlice = ev.target.result.slice(start, nextSlice)
      const enc = new TextDecoder('utf-8')
      const rawString = enc.decode(bufferSlice)
      const lines = rawString.split(/\r?\n/)
      const mimeType = file.type
      resolve({ lines, mimeType })
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
