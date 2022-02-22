import { createMockFile } from './file-mock-utils'
import ChunkedLineReader from 'lib/validation/chunked-line-reader'


describe('chunked line reader', () => {
  it('handles a file with many lines in a single chunk via iterateLines', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    const expectedLines = ['line1', 'line2', 'line3']
    expect.assertions(7)
    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 2)
      }
    })
    expect(chunker.linesRead).toEqual(3)
  })

  it('handles a non-newline terminated file, reading via iterateLines', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\nline4', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file)
    const expectedLines = ['line1', 'line2', 'line3', 'line4']
    expect.assertions(8)

    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 3)
      }
    })
  })

  it('handles newlines after chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, false, 5)
    const expectedLines = ['line1', 'line2', 'line3']
    expect.assertions(7)

    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 2)
      }
    })
    expect(chunker.hasMoreLines).toEqual(false)
  })

  it('handles newlines at chunk boundaries', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, false, 6)
    const expectedLines = ['line1', 'line2', 'line3']
    expect.assertions(7)

    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 2)
      }
    })
    expect(chunker.hasMoreLines).toEqual(false)
  })

  it('handles a file with lines across two chunks', async () => {
    const file = createMockFile({ content: 'line1\nline2\nline3\nline4\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, false, 15)

    const expectedLines = ['line1', 'line2', 'line3', 'line4']
    expect.assertions(9)

    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 3)
      }
    })
    expect(chunker.hasMoreLines).toEqual(false)
  })

  it('handles a file with lines longer than the chunk size', async () => {
    const file = createMockFile({ content: 'abcdefghij\nklmnopqrstuv\nwxyz123456\n', fileName: 'test1' })
    const chunker = new ChunkedLineReader(file, false, 7)
    const expectedLines = ['abcdefghij', 'klmnopqrstuv', 'wxyz123456']
    expect.assertions(6)

    // now check that we can read the same file correctly using the iterator
    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 2)
      }
    })
  })


  it('makes File with clean lines from incomplete content ', async () => {
    const file = createMockFile({ content: 'abcdefghij\nklmnopqrstuv\nwxy', fileName: 'test1' })

    const chunker = new ChunkedLineReader(file, true, 7)

    const expectedLines = ['abcdefghij', 'klmnopqrstuv']
    expect.assertions(4)

    // now check that we can read the same file correctly using the iterator
    await chunker.iterateLines({
      func: (line, lineNum, isLastLine) => {
        expect(line).toEqual(expectedLines[lineNum])
        expect(isLastLine).toEqual(lineNum === 1)
      }
    })
  })
})
