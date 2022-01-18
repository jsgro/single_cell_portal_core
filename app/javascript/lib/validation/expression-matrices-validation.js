/**
* @fileoverview Functions used for sparse (MTX), features, barcodes and dense file validation
*/

import {
  getParsedHeaderLines, parseLine,
  validateUniqueCellNamesWithinFile, validateMetadataLabelMatches, validateGroupColumnCounts
} from './shared-validation'

/** Parse a dense matrix file */
export async function parseDenseMatrixFile(chunker, mimeType, fileOptions) {
  const { headers, delimiter } = await getParsedHeaderLines(chunker, mimeType)
  let issues = validateDenseHeader(headers)

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    const line = parseLine(rawLine, delimiter)
    issues = issues.concat(validateValuesAreNumeric(line, isLastLine, lineNum, dataObj))
    issues = issues.concat(validateColumnNumber(line, isLastLine, headers, lineNum, dataObj))
    issues = issues.concat(validateUniqueCellNamesWithinFile(line, isLastLine, dataObj))
    issues = issues.concat(validateMetadataLabelMatches(headers, line, isLastLine, dataObj))
    issues = issues.concat(validateGroupColumnCounts(headers, line, isLastLine, dataObj))
    // add other line-by-line validations here
  })
  return { issues, delimiter, numColumns: headers[0].length }
}

/** Parse an MTX matrix file */
export async function parseSparseMatrixFile(chunker, mimeType, fileOptions) {
  let issues = []
  const delimiter = '  ' // tab delimited
  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateMTXHeaderLine(rawLine, lineNum, dataObj))
    issues = issues.concat(validateSparseColumnNumber(rawLine, isLastLine, lineNum, dataObj))
    issues = issues.concat(validateSparseNoBlankLines(rawLine, isLastLine, lineNum, dataObj))
    // add other line-by-line validations here
  })
  return { issues, delimiter, numColumns: dataObj.correctNumberOfColumns }
}


/** Parse a barcodes file, and return an array of issues, along with file parsing info */
export async function parseBarcodesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
  })
  return { issues }
}


/** Parse a features file, and return an array of issues, along with file parsing info */
export async function parseFeaturesFile(chunker, mimeType, fileOptions) {
  let issues = []

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    issues = issues.concat(validateUniqueRowValuesWithinFile(rawLine, isLastLine, dataObj))
  })
  return { issues }
}

/**
 * Verify cap format for an expression matrix file
 *
 * The "cap" for an expression matrix file is the first row
 */
function validateDenseHeader([headers]) {
  let issues = []
  if (!headers) {
    return [['error', 'format:cap:no-cap-row', 'File does not have a non-empty header row']]
  }
  issues = issues.concat(validateGeneInHeader(headers))

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
function validateColumnNumber(line, isLastLine, headers, lineNum, dataObj) {
  const issues = []
  dataObj.rowsWithIncorrectColumnNumbers = dataObj.rowsWithIncorrectColumnNumbers ? dataObj.rowsWithIncorrectColumnNumbers : []
  // use the first header row to determine the correct number of columns all rows should have
  const correctNumberOfColumns = headers[0].length

  if (correctNumberOfColumns !== line.length) {
    dataObj.rowsWithIncorrectColumnNumbers.push(lineNum)
  }

  const numBadRows = dataObj.rowsWithIncorrectColumnNumbers.length
  if (isLastLine && numBadRows > 0) {
    const rowText = numBadRows > 1 ? 'rows' : 'row'
    const maxLinesToReport = 10
    let notedBadRows = dataObj.rowsWithIncorrectColumnNumbers.slice(0, maxLinesToReport).join(', ')
    if (numBadRows - maxLinesToReport > 0) {
      notedBadRows += ` and ${numBadRows - maxLinesToReport} more rows`
    }

    const msg = `All rows must have the same number of columns. ` +
      `Please ensure the number of columns for ${rowText}: ${notedBadRows}, ` +
      `matches the file-header-specified number of ${correctNumberOfColumns} columns-per-row.`
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
  if (!line.trim()) {
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
      `Remove or replace the following ${rowText}: ${notedBadRows}, `
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

  // use the first non-comment or header row to determine correct number of columns
  if (!line.startsWith('%') && !!line.trim()) {
    dataObj.correctNumberOfColumns = dataObj.correctNumberOfColumns ? dataObj.correctNumberOfColumns : line.split(' ').length
    if (dataObj.correctNumberOfColumns !== line.split(' ').length) {
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
    issues.push(['error', 'format:invalid-type:not-numeric', msg])
  }

  return issues
}


/**
 * Verify "GENE" is present as the first column in the first row for an Expression Matrix file
 * Todo: Accept files that are R-formatted as well via this ticket: SCP-3971
 */
function validateGeneInHeader(headers) {
  const issues = []
  if (headers[0].toUpperCase() !== 'GENE') {
    const msg = 'Dense matrices require the first value of the file to be "GENE". ' +
       `However, the first value for this file currently is "${headers[0]}".`
    issues.push(['error', 'format:cap:missing-gene-column', msg])
  }

  return issues
}

/**
   * Validate the first line in the sparse Matrix begins with the string '%%MatrixMarket'
   */
function validateMTXHeaderLine(line, lineNum, dataObj) {
  const issues = []
  const mtxHeader = line.slice(0, 14)
  if (lineNum !== 0) {
    return issues
  }
  if (mtxHeader !== '%%MatrixMarket') {
    const msg = `First line must begin with "%%MatrixMarket", not "${mtxHeader}"`
    issues.push(['error', 'format:cap:missing-mtx-value', msg])
  }

  return issues
}
