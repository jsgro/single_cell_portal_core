/**
* @fileoverview Functions used for sparse (MTX), features, barcodes and dense file validation
*/

import {
  parseLine, validateUniqueCellNamesWithinFile, ParseException, timeOutCSFV
} from './shared-validation'


const whitespaceDelimiter = /\s+/

/** Parse a dense matrix file */
export async function parseDenseMatrixFile(chunker, mimeType, fileOptions) {
  const { header, delimiter, firstTwoContentLines } = await getParsedDenseMatrixHeaderLine(chunker)

  let issues = validateDenseHeader(header, firstTwoContentLines)

  // validating the header required extra lines from the file,
  // return the file reader to the first non-header line to continue validating file
  chunker.resetToFileStart()
  await chunker.iterateLines({ func: () => {}, maxLines: 1 })

  const secondLineOfFile = firstTwoContentLines[0]

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines({
    func: (rawLine, lineNum, isLastLine) => {
    // check that it's still good time
      issues = issues.concat(timeOutCSFV(chunker))

      const line = parseLine(rawLine, delimiter)
      issues = issues.concat(validateValuesAreNumeric(line, isLastLine, lineNum, dataObj))
      issues = issues.concat(validateColumnNumber(line, isLastLine, secondLineOfFile, lineNum, dataObj))
      issues = issues.concat(validateUniqueCellNamesWithinFile(line, isLastLine, dataObj))
    // add other line-by-line validations here
    }
  })
  return { issues, delimiter, numColumns: header[0].length }
}

/** Parse an MTX matrix file */
export async function parseSparseMatrixFile(chunker, mimeType, fileOptions) {
  let issues = []
  const dataObj = {} // object to track multi-line validation concerns

  let rawHeaderLine = null
  await chunker.iterateLines({
    func: rawLine => {
      rawHeaderLine = rawLine
    }, maxLines: 1
  })
  const header = rawHeaderLine.trim().split(whitespaceDelimiter)

  issues = validateMTXHeaderLine(header)

  await chunker.iterateLines({
    func: (rawLine, lineNum, isLastLine) => {
      issues = issues.concat(timeOutCSFV(chunker))

      const line = rawLine.trim().split(whitespaceDelimiter)
      issues = issues.concat(validateSparseColumnNumber(line, isLastLine, lineNum, dataObj))
      issues = issues.concat(validateSparseNoBlankLines(line, isLastLine, lineNum, dataObj))
    // add other line-by-line validations here
    }
  })
  return { issues, whitespaceDelimiter, numColumns: dataObj.correctNumberOfColumns }
}


/** Parse a barcodes file, and return an array of issues, along with file parsing info */
export async function parseBarcodesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines({
    func: (rawLine, lineNum, isLastLine) => {
      issues = issues.concat(timeOutCSFV(chunker))
      issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
    // add other line-by-line validations here
    }
  })
  return { issues }
}


/** Parse a features file, and return an array of issues, along with file parsing info */
export async function parseFeaturesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines({
    func: (rawLine, lineNum, isLastLine) => {
      issues = issues.concat(timeOutCSFV(chunker))
      issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
    // add other line-by-line validations here
    }
  })
  return { issues }
}


/**
 * Parse a dense matrix header row and first two content rows
 */
async function getParsedDenseMatrixHeaderLine(chunker) {
  // a dense matrix has a single header line
  let rawHeader = null
  // the lines following the header line are needed for R-formatted file header validation
  const rawNextTwoLines = []

  await chunker.iterateLines({
    func: line => {
      rawHeader = line
    }, maxLines: 1
  })

  if (rawHeader.trim().length === 0) {
    throw new ParseException('format:cap:missing-header-lines',
      `Your file is missing a required header line`)
  }

  // get the 2 lines following the header line
  await chunker.iterateLines({
    func: line => {
      rawNextTwoLines.push(line)
    }, maxLines: 2
  })

  const delimiter = getDenseMatrixDelimiter(rawHeader, rawNextTwoLines)

  const header = parseLine(rawHeader, delimiter)
  const firstTwoContentLines = rawNextTwoLines.map(l => parseLine(l, delimiter))

  return { header, delimiter, firstTwoContentLines }
}


/**
 * Figure out the best delimiter to use for a dense matrix file
 * This is unique from other files types due to the possibility of the file
 * being R-formatted which allows for differing row lengths
 */
function getDenseMatrixDelimiter(rawHeader, rawNextTwoLines) {
  let delimiter
  let bestDelimiter = ',' // fall back on comma -- which may give the most useful error message to the user

  // start off checking for tab characters as first clue for delimiter to use
  if (rawHeader.includes('\t')) {
    delimiter = '\t'
  } else if (rawHeader.includes(',')) {
    delimiter = ','
  }
  // test the delimiter on the header line
  const headerLength = rawHeader.split(delimiter).length

  // if the is no content in the file outside the header row
  if (rawNextTwoLines.length < 2 || rawNextTwoLines.some(l => l.length === 0)) {
    // ensure the delimter successfully broke up the line
    if (headerLength > 1) {
      bestDelimiter = delimiter
    }
  } else {
    // test out the delimter for the first 2 non-header rows
    const secondLineLength = rawNextTwoLines[0].split(delimiter).length
    const thirdLineLength = rawNextTwoLines[1].split(delimiter).length

    // ensure the delimter successfully broke up the line
    if (secondLineLength > 1) {
      // if the headerline and second line match in length use that demiliter
      if (secondLineLength === headerLength) {
        bestDelimiter = delimiter
      } // otherwise check the first 3 lines lengths against each other (see r-formatting description for futher explanation)
      else if (secondLineLength - 1 === headerLength ||
        thirdLineLength === secondLineLength ||
        thirdLineLength === headerLength) {bestDelimiter = delimiter}
    }
  }

  return bestDelimiter
}


/**
 * Verify cap format for an expression matrix file
 *
 * The "cap" for an expression matrix file is the first row also called the "header"
 *
 * A dense matrix header must start with the value "GENE" or if the file is R-formatted it can
 * start with a blank "" value as the first value.
 *
 */
function validateDenseHeader(header, nextTwoLines) {
  const issues = []
  if (!header) {
    return [['error', 'format:cap:no-header-row', 'File does not have a non-empty header row']]
  }
  const secondLine = nextTwoLines[0]
  let isValid = true
  let specificMsg = ''
  const firstValue = header[0]

  if (firstValue.toUpperCase() !== 'GENE' && firstValue !== '') {
    specificMsg = 'Try updating the first value of the header row to be "GENE". '
    isValid = false
  }

  if (secondLine.length !== header.length || header.lastIndexOf('') !== 0) {
    specificMsg += 'Ensure the header row contains the same number of columns as the following rows.'
    isValid = false
  }

  if (!isValid) {
    issues.push(['error', 'format:cap:missing-gene-column',
      `Improperly formatted header row beginning with: '${header[0]}'. ` +
      `${specificMsg}`])
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
    issues.push(['error', 'content:duplicate:values-within-file', msg])
  }
  return issues
}


/**
 * Verify dense matrix column numbers match header column numbers
 */
function validateColumnNumber(line, isLastLine, secondLineOfFile, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithIncorrectColumnNumbers = dataObj.rowsWithIncorrectColumnNumbers ? dataObj.rowsWithIncorrectColumnNumbers : []
  // use the first non-header row to determine the correct number of columns all rows should have
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
      `${containText} the same number of columns per row.`
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
  if (line.length === 1 && line[0] === '') {
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
  if ((line[0] !== '%') && line.length > 1 && line[0] !== '') {
    const numColumns = line.length
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

/** Determine if value passes `content:type:not-numeric` rule */
function hasEmptyOrNonNumericValue(array) {
  for (let i = 0; i < array.length; i++) {
    const value = array[i]
    if (value === '' || isNaN(value)) {return true}
  }
  return false
}

/**
 * Validate all values are numbers outside first column cell name
 */
function validateValuesAreNumeric(line, isLastLine, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithNonNumericValues = dataObj.rowsWithNonNumericValues ? dataObj.rowsWithNonNumericValues : []
  // skip first column
  const lineWithoutFirstColumn = line.slice(1)

  if (hasEmptyOrNonNumericValue(lineWithoutFirstColumn)) {
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
      `Please ensure all values in ${rowText} ${notedBadRows} are numbers.`
    issues.push(['error', 'content:type:not-numeric', msg])
  }

  return issues
}

/**
   * Validate the first line in the sparse matrix begins with '%%MatrixMarket'
   */
function validateMTXHeaderLine(line) {
  const issues = []
  if (line[0] !== '%%MatrixMarket') {
    const msg = `First line must begin with "%%MatrixMarket", not "${line[0]}"`
    issues.push(['error', 'format:cap:missing-mtx-value', msg])
  }

  return issues
}
