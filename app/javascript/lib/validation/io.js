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

export const oneMiB = 1024 * 1024 // 1 MiB, i.e. mebibyte
export const oneGiB = oneMiB * 1024 // 1 GiB, i.e. gebibyte
export const DEFAULT_CHUNK_SIZE = oneMiB

/** Reads up to chunkSize bytes of the given file, starting at startByte */
export async function readFileBytes(file, startByte=0, chunkSize=DEFAULT_CHUNK_SIZE, isGzipped=false) {
  console.log('in readFileBytes, isGzipped:')
  console.log(isGzipped)
  const nextSlice = startByte + chunkSize

  console.log('in readFileBytes, nextSlice:')
  console.log(nextSlice)
  const blob = file.slice(startByte, nextSlice)
  console.log('in readFileBytes, blob:')
  console.log(blob)


  const arrayBuffer = await blob.arrayBuffer()

  let stringContent = ''
  if (!isGzipped) {
    console.log('0')
    console.log('1')
    const enc = new TextDecoder('utf-8')
    console.log('3')
    stringContent = enc.decode(arrayBuffer)
    console.log('4')
  } else {
    console.log('a')
    const uint8Array = new Uint8Array(arrayBuffer)

    console.log('b')

    await new Promise((resolve, reject) => {
      // Examples: https://github.com/101arrowz/fflate#usage
      // See also:
      // - https://github.com/101arrowz/fflate/discussions/30
      // - https://github.com/101arrowz/fflate/discussions/119
      gunzip(uint8Array, (err, gunzipped) => {
        stringContent += strFromU8(gunzipped)
        resolve()
      })
    })
  }

  console.log('in readFileBytes, isGzipped:')
  console.log(isGzipped)
  // console.log(stringContent)

  return stringContent
}
