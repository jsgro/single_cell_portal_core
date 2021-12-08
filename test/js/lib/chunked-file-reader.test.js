import { createMockFile } from './file-mock-utils'
import { ChunkedLineReader } from 'lib/validation/chunked-file-reader'


describe('chunked line reader', () => {
  it('handles a file with many lines in a single chunk', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    expect(chunker.numChunks()).toEqual(1)
    const lines = await chunker.getNextChunk()
    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  it('handles a non-newline terminated file', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    expect(chunker.numChunks()).toEqual(1)
    const lines = await chunker.getNextChunk()
    expect(lines).toEqual(['line1', 'line2', 'line3'])
  })

  it('handles newlines after chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 5)
    expect(chunker.numChunks()).toEqual(4)
    const expectedLines = [[], ['line1'], ['line2'], ['line3']]
    for (let i = 0; i < 4; i++) {
      const lines = await chunker.getNextChunk()
      expect(lines).toEqual(expectedLines[i])
    }
  })

  it('handles newlines at chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 6)
    expect(chunker.numChunks()).toEqual(3)
    const expectedLines = [['line1'], ['line2'], ['line3']]
    for (let i = 0; i < 4; i++) {
      const lines = await chunker.getNextChunk()
      expect(lines).toEqual(expectedLines[i])
    }
  })

  it('handles a file with lines across two chunks', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\nline4\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 15)
    expect(chunker.numChunks()).toEqual(2)
    const lines = await chunker.getNextChunk()
    expect(lines).toEqual(['line1', 'line2'])
    const nextLines = await chunker.getNextChunk()
    expect(nextLines).toEqual(['line3', 'line4'])
  })

  it('handles a file with lines longer than the chunk size', async () => {
    const file = createMockFile({ content: 'abcdefghij\nklmnopqrstuv\nwxyz123456\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 7)
    const expectedLines = [[], ['abcdefghij'], [], ['klmnopqrstuv'], ['wxyz123456']]
    expect(chunker.numChunks()).toEqual(5)
    for (let i = 0; i < 5; i++) {
      const lines = await chunker.getNextChunk()
      expect(lines).toEqual(expectedLines[i])
    }
  })
})
