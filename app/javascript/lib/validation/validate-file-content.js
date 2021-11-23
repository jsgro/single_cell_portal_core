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
import { readLinesAndType } from './io'

/** Remove white spaces and quotes from a string value */
function clean(value) {
  return value.trim().replaceAll(/"/g, '')
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
 */
function validateUniqueCellNamesWithinFile(table) {
  const issues = []

  const cellNames = new Set()
  const duplicates = new Set()
  for (let i = 0; i < table.length; i++) {
    const cell = table[i].toString().split(/[,\t]/gm)[0].trim()
    if (cellNames.has(cell)) {
      duplicates.add(cell)
    } else {
      cellNames.add(cell)
    }
  }
  if (duplicates.size > 0) {
    const nameTxt = (duplicates.size > 1) ? 'names' : 'name'
    const dupString = [...duplicates].join(', ')
    const msg = `Cell names must be unique within a file. Please fix the following duplicated cell ${nameTxt}: ${dupString}`
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
function sniffDelimiter(lines, mimeType) {
  const [line1, line2] = lines.slice(0, 2)
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
async function validateCapFormat(table, fileType) {
  let issues = []

  // Trim spaces and quotes
  const headers = table[0].map(header => clean(header))
  const annotTypes = table[1].map(type => clean(type))

  // Check format rules that apply to both metadata and cluster files
  issues = issues.concat(
    validateUnique(headers),
    validateNameKeyword(headers),
    validateTypeKeyword(annotTypes),
    validateGroupOrNumeric(annotTypes),
    validateEqualCount(headers, annotTypes)
  )

  // Check format rules specific to either metadata or cluster file
  if (fileType === 'Metadata') {
    issues = issues.concat(validateNoMetadataCoordinates(headers))
  } else {
    issues = issues.concat(validateClusterCoordinates(headers))
  }

  return issues
}

/** Verifies metadata file has no X, Y, or Z coordinate headers */
function validateNoMetadataCoordinates(headers) {
  const issues = []

  const invalidHeaders = headers.filter(header => {
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

/** Verifies cluster file has X and Y coordinate headers */
function validateClusterCoordinates(headers) {
  const issues = []

  const xyHeaders = headers.filter(header => {
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

/** Get properties about this validation run to log to Mixpanel */
function getLogProps(fileObj, fileType, errorObj) {
  const { file, table, delimiter } = fileObj
  const { errors, summary } = errorObj

  // Avoid needless gotchas in downstream analysis
  let friendlyDelimiter = 'tab'
  if (delimiter === ',') {
    friendlyDelimiter = 'comma'
  } else if (delimiter === ' ') {
    friendlyDelimiter = 'space'
  }

  const numRows = table.length
  const numColumns = table[0].length

  const defaultProps = {
    fileType,
    numRows,
    numColumns,
    numTableCells: numRows * numColumns,
    delimiter: friendlyDelimiter,
    fileName: file.name,
    fileSize: file.size,
    fileMimeType: file.type
  }

  if (errors.length === 0) {
    return Object.assign({ status: 'success' }, defaultProps)
  } else {
    return Object.assign(defaultProps, {
      status: 'failure',
      summary,
      numErrors: errors.length,
      errors: errors.map(columns => columns[2]),
      errorTypes: errors.map(columns => columns[1])
    })
  }
}

/** confirm that the presence/absence of a .gz suffix matches the lead byte of the file */
export function validateGzipEncoding({ fileName, lines, mimeType }) {
  const GZIP_MAGIC_NUMBER = '\x1F'
  if (fileName.endsWith('.gz') && lines[0][0] !== GZIP_MAGIC_NUMBER) {
    return [['error', 'encoding:invalid-gzip-magic-number',
      'File has a ".gz" suffix but does not seem to be gzipped']]
  } else if (!fileName.endsWith('.gz') && !fileName.endsWith('.bam') && lines[0][0] === GZIP_MAGIC_NUMBER) {
    return [['error', 'encoding:missing-gz-extension',
      'File seems to be gzipped but does not have a ".gz" or ".bam" extension']]
  }
  return []
}

/** reads the file and returns the parsed rows, delimiter, and an array any issues */
async function parseFile(file, fileType) {
  let issues = []
  let table = [[]]
  let delimiter = null

  const { lines, mimeType } = await readLinesAndType(file)
  const headerLines = lines.slice(0, 2)
  issues = validateGzipEncoding({ fileName: file.name, lines, mimeType })

  if (issues.length) {
    return { table, issues, delimiter }
  }

  if (!file.name.endsWith('.gz')) {
    if (['Cluster', 'Metadata'].includes(fileType)) {
      if (lines.length < 2) {
        return { table, delimiter, issues: [['error', 'cap:format:no-newlines', 'File does not contain newlines to separate rows']] }
      }
      // if there are no encoding issues, and this isn't a gzipped file, validate content
      delimiter = sniffDelimiter(headerLines, mimeType)
      table = headerLines.map(line => line.split(delimiter))

      issues = await validateCapFormat(table, fileType, file)
      issues = issues.concat(validateUniqueCellNamesWithinFile(lines))
    }
  }
  return { table, delimiter, issues }
}

/** Validate a local file, return list formatted of any detected errors */
export async function validateFileContent(file, fileType) {
  const { table, delimiter, issues } = await parseFile(file, fileType)

  const errorObj = formatIssues(issues)
  const fileObj = { file, table, delimiter }
  const logProps = getLogProps(fileObj, fileType, errorObj)
  log('file-validation', logProps)

  return errorObj
}

/** take an array of [type, key, msg] issues, and format it */
function formatIssues(issues) {
  // Ingest Pipeline reports "issues", which includes "errors" and "warnings".
  // Keep issue type distinction in this module to ease porting, but for now
  // only report errors.
  const errors = issues.filter(issue => issue[0] === 'error')

  let summary = ''
  if (errors.length > 0) {
    const numErrors = errors.length
    const errorsTerm = (numErrors === 1) ? 'error' : 'errors'
    summary = `Your file had ${numErrors} ${errorsTerm}`
  }
  return { errors, summary }
}

