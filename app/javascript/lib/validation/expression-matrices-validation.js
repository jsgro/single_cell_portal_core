/**
* @fileoverview Functions used for sparse (MTX), features, barcodes and dense file validation
*/

import {
  parseLine, validateUniqueCellNamesWithinFile, ParseException
} from './shared-validation'


const whitespaceDelimiter = /\s+/

/** Parse a dense matrix file */
export async function parseDenseMatrixFile(chunker, mimeType, fileOptions) {
  const { header, delimiter, firstTwoContentLines } = await getParsedDenseMatrixHeaderLine(chunker, mimeType)

  let issues = validateDenseHeader(header, firstTwoContentLines)

  // validating the header required extra lines from the file,
  // return the file reader to the first non-header line to continue validating file
  chunker.resetToFileStart()
  await chunker.iterateLines(() => {}, 1)

  const secondLineOfFile = firstTwoContentLines[0]

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    const line = parseLine(rawLine, delimiter)
    issues = issues.concat(validateValuesAreNumeric(line, isLastLine, lineNum, dataObj))
    issues = issues.concat(validateColumnNumber(line, isLastLine, secondLineOfFile, lineNum, dataObj))
    issues = issues.concat(validateUniqueCellNamesWithinFile(line, isLastLine, dataObj))
    // add other line-by-line validations here
  })
  return { issues, delimiter, numColumns: header[0].length }
}

/** Parse an MTX matrix file */
export async function parseSparseMatrixFile(chunker, mimeType, fileOptions) {
  let issues = []
  const dataObj = {} // object to track multi-line validation concerns

  let rawHeaderLine = null
  await chunker.iterateLines(rawLine => {
    rawHeaderLine = rawLine
  }, 1)

  issues = validateMTXHeaderLine(rawHeaderLine)

  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateSparseColumnNumber(rawLine, isLastLine, lineNum, dataObj))
    issues = issues.concat(validateSparseNoBlankLines(rawLine, isLastLine, lineNum, dataObj))
    // add other line-by-line validations here
  })
  return { issues, whitespaceDelimiter, numColumns: dataObj.correctNumberOfColumns }
}


/** Parse a barcodes file, and return an array of issues, along with file parsing info */
export async function parseBarcodesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
    // add other line-by-line validations here
  })
  return { issues }
}


/** Parse a features file, and return an array of issues, along with file parsing info */
export async function parseFeaturesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
    // add other line-by-line validations here
  })
  return { issues }
}


/**
 * Parse a dense matrix header and first few content rows
 */
async function getParsedDenseMatrixHeaderLine(chunker, mimeType) {
  // a dense matrix has a single header line
  const headerLine = []
  // the lines following the header line are needed for R-formatted file header validation
  const followingTwoLines = []

  await chunker.iterateLines(line => {
    headerLine.push(line)
  }, 1)

  if (headerLine.length < 1 || headerLine.some(hl => hl.length === 0)) {
    throw new ParseException('format:cap:missing-header-lines',
        `Your file is missing a required header line`)
  }

  // get the 2 lines following the header line
  await chunker.iterateLines(line => {
    followingTwoLines.push(line)
  }, 2)

  const delimiter = getDenseMatrixDelimiter(headerLine, followingTwoLines)

  const header = headerLine.map(l => parseLine(l, delimiter))
  const firstTwoContentLines = followingTwoLines.map(l => parseLine(l, delimiter))

  return { header, delimiter, firstTwoContentLines }
}


/**
 * Figure out the best delimiter to use for a dense matrix file
 * This is unique from other files types due to the possibility of the file
 * being R-formatted which allows for differing row lengths
 */
function getDenseMatrixDelimiter([headerLine], followingTwoLines) {
  let delimiter
  let bestDelimiter = ',' // fall back on comma -- which may give the most useful error message to the user

  // start off checking for tab characters as first clue for delimiter to use
  if (headerLine.indexOf('\t')>=0) {
    delimiter = '\t'
  } else if (headerLine.indexOf(',')>=0) {
    delimiter = ','
  }
  // test the delimiter on the header line
  const headerLineLength = headerLine.split(delimiter).length

  // if the is no content in the file outside the header row
  if (followingTwoLines.length < 2 || followingTwoLines.some(hl => hl.length === 0)) {
    // ensure the delimter successfully broke up the line
    if (headerLineLength > 1) {
      bestDelimiter = delimiter
    }
  } else {
    // test out the delimter for the first 2 non-header rows
    const secondLineLength = followingTwoLines[0].split(delimiter).length
    const thirdLineLength = followingTwoLines[1].split(delimiter).length

    // ensure the delimter successfully broke up the line
    if (secondLineLength > 1) {
      // if the headerline and second line match in length use that demiliter
      if (secondLineLength === headerLineLength) {
        bestDelimiter = delimiter
      } // otherwise check the first 3 lines lengths against each other (see r-formatting description for futher explanation)
      else if (secondLineLength -1 === headerLineLength ||
        thirdLineLength === secondLineLength ||
        thirdLineLength === headerLineLength) {bestDelimiter = delimiter}
    }
  }

  return bestDelimiter
}


/**
 * Verify cap format for an expression matrix file
 *
 * The "cap" for an expression matrix file is the first row also called the "header"
 *
 * A dense matrix header must start with the value 'GENE' or if the file is R-formatted it can:
 *  - Not have GENE in the header and:
 *    - Have one less entry in the header than each successive row OR
 *    - Have "" as the last value in header.
 */
function validateDenseHeader([header], followingTwoLinesParsed) {
  const issues = []
  if (!header) {
    return [['error', 'format:cap:no-header-row', 'File does not have a non-empty header row']]
  }
  const secondLine = followingTwoLinesParsed[0]
  let properlyFormatted = false

  if (header[0].toUpperCase() !== 'GENE') {
    if (header.length === secondLine.length) {
      const lastVal = header[-1]
      if (lastVal === '') {
        properlyFormatted = true
      } else {
        properlyFormatted = false
      }
    } else if ((secondLine.length - 1) === header.length) {
      properlyFormatted = true
    } else {
      properlyFormatted = false
    }
  } else {
    properlyFormatted = true
  }
  if (!properlyFormatted) {
    issues.push(['error', 'format:cap:missing-gene-column',
    `Improperly formatted header row beginning with: '${header[0]}'`])
  }

  return issues
}


/**
 * Verify row values are each unique for a file
 * Per the logic in ingest pipeline check in Feature and Barcode files
 * that the values in each row are unique from all other rows in the file.
 */
function validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj) {
  const issues = []
  const line = rawLine.toString().replace(/^"|,|\s|"$/g, '')

  dataObj.rowValues = dataObj.rowValues ? dataObj.rowValues : new Set()
  dataObj.duplicateRowValues = dataObj.duplicateRowValues ? dataObj.duplicateRowValues : new Set()

  if (!dataObj.rowValues.has(line)) {
    dataObj.rowValues.add(line)
  } else {
    dataObj.duplicateRowValues.add(rawLine)
  }
  if (isLastLine && dataObj.duplicateRowValues.size > 0) {
    const nameTxt = (dataObj.duplicateRowValues.size > 1) ? 'duplicates' : 'duplicate'
    const dupString = [...dataObj.duplicateRowValues].slice(0, 10).join(', ')
    const msg = `Row values must be unique within a file. ${dataObj.duplicateRowValues.size} ${nameTxt} found, including: ${dupString}`
    issues.push(['error', 'duplicate:values-within-file', msg])
  }
  return issues
}


/**
 * Verify dense matrix column numbers match header column numbers
 */
function validateColumnNumber(line, isLastLine, secondLineOfFile, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithIncorrectColumnNumbers = dataObj.rowsWithIncorrectColumnNumbers ? dataObj.rowsWithIncorrectColumnNumbers : []
  // use the first header row to determine the correct number of columns all rows should have
  const correctNumberOfColumns = secondLineOfFile.length

  if (correctNumberOfColumns !== line.length) {
    dataObj.rowsWithIncorrectColumnNumbers.push(lineNum)
  }

  const numBadRows = dataObj.rowsWithIncorrectColumnNumbers.length
  if (isLastLine && numBadRows > 0) {
    const rowText = numBadRows > 1 ? 'rows' : 'row'
    const containText = numBadRows > 1 ? 'contain' : 'contains'

    const maxLinesToReport = 10
    let notedBadRows = dataObj.rowsWithIncorrectColumnNumbers.slice(0, maxLinesToReport).join(', ')
    if (numBadRows - maxLinesToReport > 0) {
      notedBadRows += ` and ${numBadRows - maxLinesToReport} more rows`
    }

    const msg = `All rows must have the same number of columns. ` +
      `Please ensure the number of columns for ${rowText}: ${notedBadRows}, ` +
      `${containText} the same number of columns-per-row.`
    issues.push(['error', 'format:mismatch-column-number', msg])
  }

  return issues
}

/**
 * Verify sparse matrix has no blank lines
 */
function validateSparseNoBlankLines(line, isLastLine, lineNum, dataObj) {
  const issues = []
  dataObj.blankLineRows = dataObj.blankLineRows ? dataObj.blankLineRows : []

  // if the line is empty, note it
  if (line.trim().length === 0) {
    dataObj.blankLineRows.push(lineNum)
  }

  const numBadRows = dataObj.blankLineRows.length
  if (isLastLine && numBadRows > 0) {
    const rowText = numBadRows > 1 ? 'rows' : 'row'
    const maxLinesToReport = 10
    let notedBadRows = dataObj.blankLineRows.slice(0, maxLinesToReport).join(', ')
    if (numBadRows - maxLinesToReport > 0) {
      notedBadRows += ` and ${numBadRows - maxLinesToReport} more rows`
    }

    const msg = `Please ensure there are no blank rows in the file. ` +
      `Remove or replace the following ${rowText}: ${notedBadRows}. `
    issues.push(['error', 'format:empty-row', msg])
  }

  return issues
}

/**
 * Verify sparse matrix column numbers match
 */
function validateSparseColumnNumber(line, isLastLine, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithWrongColumnNumbers = dataObj.rowsWithWrongColumnNumbers ? dataObj.rowsWithWrongColumnNumbers : []
  dataObj.correctNumberOfColumns = dataObj.correctNumberOfColumns ? dataObj.correctNumberOfColumns : ''

  // use the first non-comment, non-blank, non-header row to determine correct number of columns
  if (!line.startsWith('%') && line.trim().length > 0) {
    const numColumns = line.split(whitespaceDelimiter).length
    dataObj.correctNumberOfColumns = dataObj.correctNumberOfColumns ? dataObj.correctNumberOfColumns : numColumns
    if (dataObj.correctNumberOfColumns !== numColumns) {
      dataObj.rowsWithWrongColumnNumbers.push(lineNum)
    }
  }

  const numBadRows = dataObj.rowsWithWrongColumnNumbers.length
  if (isLastLine && numBadRows > 0) {
    const rowText = numBadRows > 1 ? 'rows' : 'row'
    const maxLinesToReport = 10
    let notedBadRows = dataObj.rowsWithWrongColumnNumbers.slice(0, maxLinesToReport).join(', ')
    if (numBadRows - maxLinesToReport > 0) {
      notedBadRows += ` and ${numBadRows - maxLinesToReport} more rows`
    }

    const msg = `All rows must have the same number of columns - ` +
      `please ensure the number of columns for ${rowText}: ${notedBadRows}, ` +
      `matches the specificed number of columns-per-row.`
    issues.push(['error', 'format:mismatch-column-number', msg])
  }

  return issues
}


/**
 * Validate all values are numbers outside first column cell name
 */
function validateValuesAreNumeric(line, isLastLine, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithNonNumericValues = dataObj.rowsWithNonNumericValues ? dataObj.rowsWithNonNumericValues : []
  // skip first column
  const lineWithoutFirstColumn = line.slice(1)

  if (lineWithoutFirstColumn.some(isNaN)) {
    dataObj.rowsWithNonNumericValues.push(lineNum)
  }

  const numBadRows = dataObj.rowsWithNonNumericValues.length
  if (isLastLine && numBadRows > 0) {
    const rowText = numBadRows > 1 ? 'rows' : 'row'
    const maxLinesToReport = 10
    let notedBadRows = dataObj.rowsWithNonNumericValues.slice(0, maxLinesToReport).join(', ')
    if (numBadRows - maxLinesToReport > 0) {
      notedBadRows += ` and ${numBadRows - maxLinesToReport} more rows`
    }

    const msg = `All values (other than the first column and header row) in a dense matrix file must be numeric. ` +
      `Please ensure all values in ${rowText}: ${notedBadRows}, are numbers.`
    issues.push(['error', 'content:invalid-type:not-numeric', msg])
  }

  return issues
}

/**
   * Validate the first line in the sparse Matrix begins with the string '%%MatrixMarket'
   */
function validateMTXHeaderLine(line) {
  const issues = []
  const mtxHeader = line.slice(0, 14)
  if (mtxHeader !== '%%MatrixMarket') {
    const msg = `First line must begin with "%%MatrixMarket", not "${mtxHeader}"`
    issues.push(['error', 'format:cap:missing-mtx-value', msg])
  }

  return issues
}
