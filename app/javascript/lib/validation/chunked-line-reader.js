import { DEFAULT_CHUNK_SIZE, readFileBytes } from './io'

const newlineRegex = /\r?\n/

/**
 * reads lines from a file in a chunked way, so that the file does not have to be in memory all at once
 * Basic usage:
 * const chunker = new ChunkedLineReader(file)
 * chunker.iterateLines((line, lineNum, isLastLine) => {
 *   // do stuff
 * }) {
 * }
 */
export default class ChunkedLineReader {
  /** create a new chunk reader */
  constructor(file, chunkSize=DEFAULT_CHUNK_SIZE) {
    this.file = file
    this.nextByteToRead = 0
    this.chunkSize = chunkSize
    this.linesRead = 0
    this.currentFragment = null // currentFragment stores the parts of lines that cross chunk boundaries
    this.chunkLines = []
    this.updateHasMoreChunks()
    this.updateHasMoreLines()
    this.resetToFileStart()
  }

  /**
   * Use this function to reset the reader to the start of the file
   */
  resetToFileStart() {
    this.linesRead = 0
    this.nextByteToRead = 0
    this.chunkLines = []
    this.updateHasMoreChunks()
    this.updateHasMoreLines()
  }

  /**
   * iterates over the remaining lines in the file, calling func(line, lineNum, isLastLine) for each line
   * (lineNum is 0-indexed).
   * maxBytesPerLine can be set to avoid reading the entire file into memory in the event the file is missing
   * proper newlines
  */
  async iterateLines(func, maxLines=Number.MAX_SAFE_INTEGER, maxBytesPerLine=1000*1000*1024) {
    const prevLinesRead = this.linesRead
    while ((this.hasMoreChunks || this.chunkLines.length) &&
           !(this.linesRead === 0 && this.nextByteToRead > maxBytesPerLine) &&
           this.linesRead < prevLinesRead + maxLines) {
      if (!this.chunkLines.length && this.hasMoreChunks) {
        await this.readNextChunk()
      }
      if (this.chunkLines.length) {
        this.linesRead++ // convenience tracker
        const line = this.chunkLines.shift()
        this.updateHasMoreLines()
        func(line, this.linesRead - 1, !this.hasMoreLines)
      }
    }
  }

  /**
   * reads a file as lines in a set of 'chunks'  Each chunk is determined by chunkSize
   * This handles tracking lines that span chunk boundaries -- such lines will be excluded
   * from the chunk they start in, and included in full in the subsequent chunk.
   * Note that this means some chunks may be "empty" if there are lines that span entire chunks.
   *
   * So e.g. if an expression file has a 4.5MB long header row listing the cells, the first four calls
   * to 'readNextChunk' will put an empty into chunkLines, and then the fifth call will return the full line.
   */
  async readNextChunk() {
    if (!this.hasMoreChunks) {
      return false
    }
    const startByte = this.nextByteToRead
    const isLastChunk = startByte + this.chunkSize >= this.file.size
    const chunkString = await readFileBytes(this.file, startByte, this.chunkSize)

    const lines = chunkString.split(newlineRegex)

    if (this.currentFragment) {
      if (lines[0][0] === '\n') {
        // the current chunk started with a newline, so the previousFragment was in fact an intact line
        lines.unshift(this.currentFragment)
      } else {
        // append the fragment to the beginning of the first line
        lines[0] = this.currentFragment + lines[0]
      }
    }
    this.currentFragment = null
    this.nextByteToRead = this.nextByteToRead + chunkString.length
    if (!isLastChunk || chunkString.slice(-1).match(newlineRegex)) {
      // As long as this isn't a last chunk of a file that isn't newline terminated,
      // omit the last line, and save it to append to the next chunk (if there is one).
      // This takes care of both handling fragments, and removing the empty line generated by
      // .split() if the chunk is newline terminated
      this.currentFragment = lines.pop()
    }
    this.updateHasMoreChunks()
    this.chunkLines = lines
  }

  /** sets boolean of whether getNextChunk() has more chunks available */
  updateHasMoreChunks() {
    this.hasMoreChunks = this.nextByteToRead < this.file.size
  }

  /** sets boolean of whether getNextLine() has more chunks available */
  updateHasMoreLines() {
    this.hasMoreLines = this.chunkLines.length || this.hasMoreChunks
  }
}

