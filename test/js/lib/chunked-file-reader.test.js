import { createMockFile } from './file-mock-utils'
import ChunkedLineReader from 'lib/validation/chunked-line-reader'


describe('chunked line reader', () => {
  it('handles a file with many lines in a single chunk via iterateLines or getNextLine', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    const expectedLines = ['line1', 'line2', 'line3']
    expect.assertions(11)
    await chunker.iterateLines((line, lineNum, isLastLine) => {
      expect(line).toEqual(expectedLines[lineNum])
      expect(isLastLine).toEqual(lineNum === 2)
    })
    expect(chunker.linesRead).toEqual(3)

    const chunker2 = new ChunkedLineReader(file)
    for (let i = 0; i < 3; i++) {
      const lines = await chunker2.getNextLine()
      expect(lines).toEqual(expectedLines[i])
    }
    expect(chunker2.linesRead).toEqual(3)
  })

  it('handles a non-newline terminated file, reading via a mix of getNextLine and iterateLines', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\nline4', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    const expectedLines = ['line1', 'line2', 'line3', 'line4']
    expect.assertions(6)
    const [line1, line2] = [await chunker.getNextLine(), await chunker.getNextLine()]
    expect(line1).toEqual(expectedLines[0])
    expect(line2).toEqual(expectedLines[1])

    await chunker.iterateLines((line, lineNum, isLastLine) => {
      expect(line).toEqual(expectedLines[lineNum])
      expect(isLastLine).toEqual(lineNum === 3)
    })
  })

  it('handles newlines after chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 5)
    const expectedLines = ['line1', 'line2', 'line3']
    for (let i = 0; i < 3; i++) {
      const line = await chunker.getNextLine()
      expect(line).toEqual(expectedLines[i])
    }
    expect(chunker.hasMoreLines).toEqual(false)
    expect(await chunker.getNextLine()).toBeUndefined()
  })

  it('handles newlines at chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 6)
    const expectedLines = ['line1', 'line2', 'line3']
    for (let i = 0; i < 3; i++) {
      const line = await chunker.getNextLine()
      expect(line).toEqual(expectedLines[i])
    }
    expect(chunker.hasMoreLines).toEqual(false)
  })

  it('handles a file with lines across two chunks', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\nline4\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 15)

    const expectedLines = ['line1', 'line2', 'line3', 'line4']
    for (let i = 0; i < 4; i++) {
      const line = await chunker.getNextLine()
      expect(line).toEqual(expectedLines[i])
    }
    expect(chunker.hasMoreLines).toEqual(false)
  })

  it('handles a file with lines longer than the chunk size', async () => {
    const file = createMockFile({ content: 'abcdefghij\nklmnopqrstuv\nwxyz123456\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, 7)
    const expectedLines = ['abcdefghij', 'klmnopqrstuv', 'wxyz123456']
    expect.assertions(10)
    for (let i = 0; i < 3; i++) {
      const line = await chunker.getNextLine()
      expect(line).toEqual(expectedLines[i])
    }
    expect(chunker.hasMoreLines).toEqual(false)

    // now check that we can read the same file correctly using the iterator
    const chunker2 = new ChunkedLineReader(file, 7)
    await chunker2.iterateLines((line, lineNum, isLastLine) => {
      expect(line).toEqual(expectedLines[lineNum])
      expect(isLastLine).toEqual(lineNum === 2)
    })
  })
})
