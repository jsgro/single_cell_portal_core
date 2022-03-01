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

export const MiB = 1024 * 1024 // 1 MiB

export const GiB = MiB * 1000 // 1 GiB
export const DEFAULT_CHUNK_SIZE = MiB

/** Reads up to chunkSize bytes of the given file, starting at startByte */
export async function readFileBytes(file, startByte=0, chunkSize=DEFAULT_CHUNK_SIZE) {
  const nextSlice = startByte + chunkSize

  const blob = file.slice(startByte, nextSlice)

  const arrayBuffer = await blob.arrayBuffer()
  const enc = new TextDecoder('utf-8')

  const stringContent = enc.decode(arrayBuffer)
  return stringContent
}
