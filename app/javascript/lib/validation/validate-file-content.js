/**
* @fileoverview Validates Single Cell Portal files on the user's computer
*
* Where feasible, these functions and data structures align with those in
* Ingest Pipeline [1].  Such consistency across codebases eases QA, debugging,
* and overall maintainability.
*
* [1] E.g. https://github.com/broadinstitute/scp-ingest-pipeline/blob/development/ingest/validation/validate_metadata.py
*/

import { log } from 'lib/metrics-api'
import { readFileBytes } from './io'
import ChunkedLineReader from './chunked-line-reader'
import { PARSEABLE_TYPES } from 'components/upload/upload-utils'

// from lib/assets/metadata_schemas/alexandria_convention_schema.json (which in turn is from scp-ingest-pipeline/schemas)
export const REQUIRED_CONVENTION_COLUMNS = [
  'biosample_id',
  'disease',
  'disease__ontology_label',
  'donor_id',
  'library_preparation_protocol',
  'library_preparation_protocol__ontology_label',
  'organ',
  'organ__ontology_label',
  'sex',
  'species',
  'species__ontology_label'
]

/**
 * ParseException can be thrown when we encounter an error that prevents us from parsing the file further
 */
function ParseException(key, msg) {
  this.message = msg
  this.key = key
}

/**
 * Splits the line on a delimiter, and
 * removes leading and trailing white spaces and quotes from values
 */
export function parseLine(line, delimiter) {
  const splitLine = line.split(delimiter)
  const parsedLine = new Array(parseLine.length)
  for (let i = 0; i < splitLine.length; i++) {
    parsedLine[i] = splitLine[i].trim().replace(/^"|"$/g, '')
  }
  return parsedLine
}

/**
 * Verify headers are unique and not empty
 */
function validateUnique(headers) {
  // eslint-disable-next-line max-len
  // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/0b6289dd91f877e5921a871680602d776271217f/ingest/annotations.py#L233
  const issues = []
  const uniques = new Set(headers)

  // Are headers unique?
  if (uniques.size !== headers.length) {
    const seen = new Set()
    const duplicates = new Set()
    headers.forEach(header => {
      if (seen.has(header)) {duplicates.add(header)}
      seen.add(header)
    })

    const dupString = [...duplicates].join(', ')
    const msg = `Duplicate header names are not allowed: ${dupString}`
    issues.push(['error', 'format:cap:unique', msg])
  }

  // Are all headers non-empty?
  if (uniques.has('')) {
    const msg = 'Headers cannot contain empty values'
    issues.push(['error', 'format:cap:no-empty', msg])
  }

  return issues
}

/**
 * Helper function to verify first pair of headers is NAME or TYPE
 */
function validateKeyword(values, expectedValue) {
  const issues = []

  const ordinal = (expectedValue === 'NAME') ? 'First' : 'Second'
  const location = `${ordinal} row, first column`
  const value = values[0]
  const actual = `Your value was "${value}".`

  if (value.toUpperCase() === expectedValue) {
    if (value !== expectedValue) {
      const msg =
        `${location} should be ${expectedValue}. ${actual}`
      issues.push(['warn', 'format', msg])
    }
  } else {
    const msg =
      `${location} must be "${expectedValue}" (case insensitive). ${actual}`
    const logType = expectedValue.toLowerCase()
    issues.push(['error', `format:cap:${logType}`, msg])
  }

  return issues
}

/**
 * Verify second row starts with NAME (case-insensitive)
 */
function validateNameKeyword(headers) {
  // eslint-disable-next-line max-len
  // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/0b6289dd91f877e5921a871680602d776271217f/ingest/annotations.py#L216
  return validateKeyword(headers, 'NAME')
}

/**
 * Verify second row starts with TYPE (case-insensitive)
 */
function validateTypeKeyword(annotTypes) {
  // eslint-disable-next-line max-len
  // Mirrors https://github.com/broadinstitute/scp-ingest-pipeline/blob/0b6289dd91f877e5921a871680602d776271217f/ingest/annotations.py#L258
  return validateKeyword(annotTypes, 'TYPE')
}

/**
 * Verify type annotations (second row) contain only "group" or "numeric"
 */
function validateGroupOrNumeric(annotTypes) {
  const issues = []
  const invalidTypes = []

  // Skip the TYPE keyword
  const types = annotTypes.slice(1)

  types.forEach(type => {
    if (!['group', 'numeric'].includes(type.toLowerCase())) {
      if (type === '') {
        // If the value is a blank space, store a higher visibility
        // string for error reporting
        invalidTypes.push('<empty value>')
      } else {
        invalidTypes.push(type)
      }
    }
  })

  if (invalidTypes.length > 0) {
    const badValues = `"${invalidTypes.join('", "')}"`
    const msg =
      'Second row, all columns after first must be "group" or "numeric". ' +
      `Your values included ${badValues}`

    issues.push(['error', 'format:cap:group-or-numeric', msg])
  }

  return issues
}

/**
 * Verify equal counts for headers and annotation types
 */
function validateEqualCount(headers, annotTypes) {
  const issues = []

  if (headers.length > annotTypes.length) {
    const msg =
      'First row must have same number of columns as second row. ' +
      `Your first row has ${headers.length} header columns and ` +
      `your second row has ${annotTypes.length} annotation type columns.`
    issues.push(['error', 'format:cap:count', msg])
  }

  return issues
}


/**
 * Verify cell names are each unique for a cluster or metadata file
 * creates and uses 'cellNames' and 'duplicateCellNames' properties on dataObj to track
 * cell names between calls to this function
 */
function validateUniqueCellNamesWithinFile(line, isLastLine, dataObj) {
  const issues = []

  dataObj.cellNames = dataObj.cellNames ? dataObj.cellNames : new Set()
  dataObj.duplicateCellNames = dataObj.duplicateCellNames ? dataObj.duplicateCellNames : new Set()

  const cell = line[0]
  if (!dataObj.cellNames.has(cell)) {
    dataObj.cellNames.add(cell)
  } else {
    dataObj.duplicateCellNames.add(cell)
  }
  if (isLastLine && dataObj.duplicateCellNames.size > 0) {
    const nameTxt = (dataObj.duplicateCellNames.size > 1) ? 'duplicates' : 'duplicate'
    const dupString = [...dataObj.duplicateCellNames].slice(0, 10).join(', ')
    const msg = `Cell names must be unique within a file. ${dataObj.duplicateCellNames.size} ${nameTxt} found, including: ${dupString}`
    issues.push(['error', 'duplicate:cells-within-file', msg])
  }
  return issues
}

/**
 * Guess whether column delimiter is comma or tab
 *
 * Consider using `papaparse` NPM package once it supports ES modules.
 * Upstream task: https://github.com/mholt/PapaParse/pull/875
 */
function sniffDelimiter([line1, line2], mimeType) {
  const delimiters = [',', '\t']
  let bestDelimiter

  delimiters.forEach(delimiter => {
    const numFieldsLine1 = line1.split(delimiter).length
    const numFieldsLine2 = line2.split(delimiter).length

    if (numFieldsLine1 !== 1 && numFieldsLine1 === numFieldsLine2) {
      bestDelimiter = delimiter
    }
  })

  if (typeof bestDelimiter === 'undefined') {
    if (mimeType === 'text/tab-separated-values') {
      bestDelimiter = '\t'
    } else {
      // fall back on comma -- which may give the most useful error message to the user
      bestDelimiter = ','
    }
  }
  return bestDelimiter
}

/**
 * Verify cap format for a cluster or metadata file
 *
 * The "cap" of an SCP study file is its first two lines, i.e.:
 *  - Header (row 1), and
 *  - Annotation types (row 2)
 *
 * Cap lines are like meta-information lines in other file formats
 * (e.g. VCF), but do not begin with pound signs (#).
 */
function validateCapFormat([headers, annotTypes]) {
  let issues = []
  if (!headers || !annotTypes) {
    return [['error', 'format:cap:no-cap-rows', 'File does not have 2 non-empty header rows']]
  }

  // Check format rules that apply to both metadata and cluster files
  issues = issues.concat(
    validateUnique(headers),
    validateNameKeyword(headers),
    validateTypeKeyword(annotTypes),
    validateGroupOrNumeric(annotTypes),
    validateEqualCount(headers, annotTypes)
  )
  return issues
}

/** Verifies metadata file has no X, Y, or Z coordinate headers */
function validateNoMetadataCoordinates(headers) {
  const issues = []

  const invalidHeaders = headers[0].filter(header => {
    return ['x', 'y', 'z'].includes(header.toLowerCase())
  })

  if (invalidHeaders.length > 0) {
    const badValues = `"${invalidHeaders.join('", "')}"`
    const msg =
      'First row must not include coordinates X, Y, or Z ' +
      '(case insensitive) as column header values. ' +
      `Your values included ${badValues}.`
    issues.push(['error', 'format:cap:metadata-no-coordinates', msg])
  }

  return issues
}

/** Verifies metadata file has all required columns */
function validateRequiredMetadataColumns(parsedHeaders) {
  const issues = []
  const firstLine = parsedHeaders[0]
  const missingCols = []
  REQUIRED_CONVENTION_COLUMNS.forEach(colName => {
    if (!firstLine.includes(colName)) {
      missingCols.push(colName)
    }
  })
  if (missingCols.length) {
    const msg = `File is missing required columns ${missingCols.join(', ')}`
    issues.push(['error', 'format:cap:metadata-missing-column', msg])
  }
  return issues
}

/**
 * Verify that, for id columns with a corresponding label column, no label is shared across two or more ids.
 * The main circumstance this is aimed at checking is the 'Excel drag error', in which by drag-copying a row, the
 * label is copied correctly, but the id string gets numerically incremented
 */
function validateMetadataLabelMatches(headers, line, isLastLine, dataObj) {
  const issues = []
  const excludedColumns = ['NAME']
  // if this is the first time through, identify the columns to check, and initialize data structures to track mismatches
  if (!dataObj.dragCheckColumns) {
    dataObj.dragCheckColumns = headers[0].map((colName, index) => {
      const labelColumnIndex = headers[0].indexOf(`${colName }__ontology_label`)
      if (excludedColumns.includes(colName) ||
        colName.endsWith('ontology_label') ||
        headers[1][index] === 'numeric' ||
        labelColumnIndex === -1) {
        return null
      }
      // for each column, track a hash of label=>value,
      // and also a set of mismatched values--where the same label is used for different ids
      return { colName, index, labelColumnIndex, labelValueMap: {}, mismatchedVals: new Set() }
    }).filter(c => c)
  }
  // for each column we need to check, see if there is a corresponding filled-in label,
  //  and track whether other ids have been assigned to that label too
  for (let i = 0; i < dataObj.dragCheckColumns.length; i++) {
    const dcc = dataObj.dragCheckColumns[i]
    const colValue = line[dcc.index]
    const label = line[dcc.labelColumnIndex]
    if (label.length) {
      if (dcc.labelValueMap[label] && dcc.labelValueMap[label] !== colValue) {
        dcc.mismatchedVals.add(label)
      } else {
        dcc.labelValueMap[label] = colValue
      }
    }
  }

  // only report out errors if this is the last line of the file so that a single, consolidated message can be displayed per column
  if (isLastLine) {
    dataObj.dragCheckColumns.forEach(dcc => {
      if (dcc.mismatchedVals.size > 0) {
        const labelString = [...dcc.mismatchedVals].slice(0, 10).join(', ')
        const moreLabelsString = dcc.mismatchedVals.size > 10 ? ` and ${dcc.mismatchedVals.size - 10} others`: ''
        issues.push(['error', 'content:metadata:mismatched-id-label',
          `${dcc.colName} has different ID values mapped to the same label.
          Label(s) with more than one corresponding ID: ${labelString}${moreLabelsString}`])
      }
    })
  }
  return issues
}
/** raises a warning if a group column has more than 200 unique values */
function validateGroupColumnCounts(headers, line, isLastLine, dataObj) {
  const issues = []
  const excludedColumns = ['NAME']
  if (!dataObj.groupCheckColumns) {
    dataObj.groupCheckColumns = headers[0].map((colName, index) => {
      if (excludedColumns.includes(colName) || colName.endsWith('ontology_label') || headers[1][index] === 'numeric') {
        return null
      }
      return { colName, index, uniqueVals: new Set() }
    }).filter(c => c)
  }
  for (let i = 0; i < dataObj.groupCheckColumns.length; i++) {
    const gcc = dataObj.groupCheckColumns[i]
    const colValue = line[gcc.index]
    if (colValue) { // don't bother adding empty values
      gcc.uniqueVals.add(colValue)
    }
  }

  if (isLastLine) {
    dataObj.groupCheckColumns.forEach(gcc => {
      if (gcc.uniqueVals.size > 200) {
        issues.push(['warn', 'content:group-col-over-200',
          `${gcc.colName} has over 200 unique values and so will not be visible in plots -- is this intended?`])
      }
    })
  }
  return issues
}

/** Verifies cluster file has X and Y coordinate headers */
function validateClusterCoordinates(headers) {
  const issues = []

  const xyHeaders = headers[0].filter(header => {
    return ['x', 'y'].includes(header.toLowerCase())
  })

  if (xyHeaders.length < 2) {
    const msg =
      'First row must include coordinates X and Y ' +
      '(case insensitive) as column header values.'
    issues.push(['error', 'format:cap:cluster-coordinates', msg])
  }

  return issues
}

/** parse a metadata file, and return an array of issues, along with file parsing info */
export async function parseMetadataFile(chunker, mimeType, fileOptions) {
  const { headers, delimiter } = await getParsedHeaderLines(chunker, mimeType, 2)

  let issues = validateCapFormat(headers, delimiter)
  issues = issues.concat(validateNoMetadataCoordinates(headers))
  if (fileOptions.use_metadata_convention) {
    issues = issues.concat(validateRequiredMetadataColumns(headers))
  }

  // add other header validations here

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawline, lineNum, isLastLine) => {
    const line = parseLine(rawline, delimiter)
    issues = issues.concat(validateUniqueCellNamesWithinFile(line, isLastLine, dataObj))
    issues = issues.concat(validateMetadataLabelMatches(headers, line, isLastLine, dataObj))
    issues = issues.concat(validateGroupColumnCounts(headers, line, isLastLine, dataObj))
    // add other line-by-line validations here
  })
  return { issues, delimiter, numColumns: headers[0].length }
}

/** parse a cluster file, and return an array of issues, along with file parsing info */
export async function parseClusterFile(chunker, mimeType) {
  const { headers, delimiter } = await getParsedHeaderLines(chunker, mimeType, 2)

  let issues = validateCapFormat(headers, delimiter)
  issues = issues.concat(validateClusterCoordinates(headers))
  // add other header validations here

  const dataObj = {} // object to track multi-line validation concerns
  await chunker.iterateLines((rawLine, lineNum, isLastLine) => {
    const line = parseLine(rawLine, delimiter)
    issues = issues.concat(validateUniqueCellNamesWithinFile(line, isLastLine, dataObj))
    issues = issues.concat(validateGroupColumnCounts(headers, line, isLastLine, dataObj))
    // add other line-by-line validations here
  })

  return { issues, delimiter, numColumns: headers[0].length }
}

/** reads in the specified number of header lines, sniffs the delimiter, and returns the
 * lines parsed by the sniffed delimiter
 */
export async function getParsedHeaderLines(chunker, mimeType, numHeaderLines=2) {
  const headerLines = []
  await chunker.iterateLines((line, lineNum, isLastLine) => {
    headerLines.push(line)
  }, 2)
  if (headerLines.length < numHeaderLines || headerLines.some(hl => !hl)) {
    throw new ParseException('format:cap:missing-header-lines',
      `Your file is missing newlines or is missing some of the required ${numHeaderLines} header lines`)
  }
  const delimiter = sniffDelimiter(headerLines, mimeType)
  const headers = headerLines.map(l => parseLine(l, delimiter))
  return { headers, delimiter }
}


/** confirm that the presence/absence of a .gz suffix matches the lead byte of the file
 * Throws an exception if the gzip is conflicted, since we don't want to parse further in that case
*/
export async function validateGzipEncoding(file) {
  const GZIP_MAGIC_NUMBER = '\x1F'
  const fileName = file.name
  let isGzipped = null

  // read a single byte from the file to check the magic number
  const firstByte = await readFileBytes(file, 0, 1)
  if (fileName.endsWith('.gz') || fileName.endsWith('.bam')) {
    if (firstByte === GZIP_MAGIC_NUMBER) {
      isGzipped = true
    } else {
      throw new ParseException('encoding:invalid-gzip-magic-number',
        'File has a .gz or .bam suffix but does not seem to be gzipped')
    }
  } else {
    if (firstByte === GZIP_MAGIC_NUMBER) {
      throw new ParseException('encoding:missing-gz-extension',
        'File seems to be gzipped but does not have a ".gz" or ".bam" extension')
    } else {
      isGzipped = false
    }
  }
  return isGzipped
}


/** reads the file and returns a fileInfo object along with an array of issues */
async function parseFile(file, fileType, fileOptions={}) {
  const fileInfo = {
    fileSize: file.size,
    fileName: file.name,
    linesRead: 0,
    numColumns: null,
    fileMimeType: file.type,
    fileType,
    delimiter: null,
    isGzipped: null
  }
  const parseResult = { fileInfo, issues: [] }
  try {
    fileInfo.isGzipped = await validateGzipEncoding(file)

    // if the file is compressed or we can't figure out the compression, don't try to parse further
    if (fileInfo.isGzipped || !PARSEABLE_TYPES.includes(fileType)) {
      return { fileInfo, issues: [] }
    }
    const parseFunctions = {
      'Cluster': parseClusterFile,
      'Metadata': parseMetadataFile
    }
    if (parseFunctions[fileType]) {
      const chunker = new ChunkedLineReader(file)
      const { issues, delimiter, numColumns } = await parseFunctions[fileType](chunker, fileInfo.fileMimeType, fileOptions)
      fileInfo.linesRead = chunker.linesRead
      fileInfo.delimiter = delimiter
      fileInfo.numColumns = numColumns
      parseResult.issues = issues
    }
  } catch (error) {
    // get any unhandled or deliberate short-circuits
    if (error instanceof ParseException) {
      parseResult.issues.push(['error', error.key, error.message])
    } else {
      parseResult.issues.push(['error', 'parse:unhandled', error.message])
    }
  }
  return parseResult
}

/** Validate a local file, return { errors, warnings, summary } object, where errors is an array of errors, and summary
 * is a message like "Your file had 2 errors"
 */
export async function validateFileContent(file, fileType, fileOptions={}) {
  const startTime = performance.now()
  const { fileInfo, issues } = await parseFile(file, fileType, fileOptions)
  const perfTime = Math.round(performance.now() - startTime)

  const errorObj = formatIssues(issues)
  const logProps = getLogProps(fileInfo, errorObj, perfTime)
  log('file-validation', logProps)

  return errorObj
}

/** take an array of [type, key, msg] issues, and format it */
function formatIssues(issues) {
  const errors = issues.filter(issue => issue[0] === 'error')
  const warnings = issues.filter(issue => issue[0] === 'warn')
  let summary = ''
  if (errors.length > 0 || warnings.length) {
    const errorsTerm = (errors.length === 1) ? 'error' : 'errors'
    const warningsTerm = (warnings.length === 1) ? 'warning' : 'warnings'
    summary = `Your file had ${errors.length} ${errorsTerm}`
    if (warnings.length) {
      summary = `${summary}, ${warnings.length} ${warningsTerm}`
    }
  }
  return { errors, warnings, summary }
}


/** Get properties about this validation run to log to Mixpanel */

function getLogProps(fileInfo, errorObj, perfTime) {
  const { errors, warnings, summary } = errorObj

  // Avoid needless gotchas in downstream analysis
  let friendlyDelimiter = 'tab'
  if (fileInfo.delimiter === ',') {
    friendlyDelimiter = 'comma'
  } else if (fileInfo.delimiter === ' ') {
    friendlyDelimiter = 'space'
  }

  const defaultProps = {
    ...fileInfo,
    perfTime,
    delimiter: friendlyDelimiter,
    numTableCells: fileInfo.numColumns ? fileInfo.numColumns * fileInfo.linesRead : 0
  }

  if (errors.length === 0) {
    return Object.assign({ status: 'success' }, defaultProps)
  } else {
    return Object.assign(defaultProps, {
      status: 'failure',
      summary,
      numErrors: errors.length,
      numWarnings: warnings.length,
      errors: errors.map(columns => columns[2]),
      warnings: warnings.map(columns => columns[2]),
      errorTypes: errors.map(columns => columns[1]),
      warningTypes: warnings.map(columns => columns[1])
    })
  }
}

