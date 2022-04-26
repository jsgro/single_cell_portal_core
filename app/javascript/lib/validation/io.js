/**
 * @fileoverview Input and output (IO) functions for SCP file validation
 *
 * To automatically test without strange workarounds [1],
 * any mocked function must be imported from a separate module than the module under test.
 * And readFileBytes needs to be mocked since blob.arrayBuffer() is not available in nodejs.
 * This was the original motivation to extract this function to its own module.
 *
 * [1] https://stackoverflow.com/a/47976589
*/

import { gunzip, strFromU8 } from 'fflate'

export const newlineRegex = /\r?\n/

export const oneMiB = 1024 * 1024 // 1 MiB, i.e. mebibyte
export const oneGiB = oneMiB * 1024 // 1 GiB, i.e. gebibyte
export const DEFAULT_CHUNK_SIZE = oneMiB

/** Reads up to chunkSize bytes of the given file, starting at startByte */
export async function readFileBytes(file, startByte=0, chunkSize=DEFAULT_CHUNK_SIZE) {
  const nextSlice = startByte + chunkSize

  const blob = file.slice(startByte, nextSlice)

  const arrayBuffer = await blob.arrayBuffer()

  const enc = new TextDecoder('utf-8')
  const stringContent = enc.decode(arrayBuffer)

  return stringContent
}

/** Read an entire gzipped file, return string */
export async function readGzipFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  // Examples: https://github.com/101arrowz/fflate#usage
  // See also:
  // - https://github.com/101arrowz/fflate/discussions/30
  // - https://github.com/101arrowz/fflate/discussions/119
  //
  // Consider refactoring ChunkedLineReader to enable real streaming-gunzip,
  // to mitigate UI freezes for non-tiny gzipped files.  This might
  // make sense to do as part of a larger refactor to parallelize
  // byte-upload and file validation.
  const uint8Array = new Uint8Array(arrayBuffer)

  let stringContent = ''
  await new Promise((resolve, reject) => {
    // Examples: https://github.com/101arrowz/fflate#usage
    // See also:
    // - https://github.com/101arrowz/fflate/discussions/30
    // - https://github.com/101arrowz/fflate/discussions/119
    //
    // Consider refactoring ChunkedLineReader to enable real streaming-gunzip,
    // to mitigate UI freezes for non-tiny gzipped files.  This might
    // make sense to do as part of a larger refactor to parallelize
    // byte-upload and file validation.
    //
    // This faux-streaming approach is more performant than equivalent
    // gunzipSync -- it freezes the UI less.
    gunzip(uint8Array, (err, gunzipped) => {
      stringContent += strFromU8(gunzipped)
      resolve()
    })
  })

  // This is the slower-but-intuitive synchronous approach noted above
  // const stringContent = strFromU8(gunzipSync(uint8Array))

  return stringContent
}
