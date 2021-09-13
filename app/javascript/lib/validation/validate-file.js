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
function validateUniqueHeaders(headers) {
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
    issues.push(['error', 'format', msg])
  }

  // Are all headers non-empty?
  if (uniques.has('')) {
    const msg = 'Headers cannot contain empty values'
    issues.push(['error', 'format', msg])
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
    issues.push(['error', 'format', msg])
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
 * Verify second row contains only "group" or "numeric"
 */
function validateTypeAnnotations(annotTypes) {
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

    issues.push(['error', 'format', msg])
  }

  return issues
}

/**
 * Verify equal counts for headers and annotation types.
 */
function validateHeaderCount(headers, annotTypes) {
  const issues = []

  if (headers.length > annotTypes.length) {
    const msg =
      'First row must have same number of columns as second row. ' +
      `Your first row has ${headers.length} header columns and ` +
      `your second row has ${annotTypes.length} annotation type columns.`
    issues.push(['error', 'format', msg])
  }

  return issues
}

/**
 * Guess whether column delimiter is comma or tab.
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
    }
  }

  return bestDelimiter
}

/** Validate a local metadata file */
async function validateFormat(file) {
  const { lines, mimeType } = await readLinesAndType(file, 2)

  const delimiter = sniffDelimiter(lines, mimeType)
  const table = lines.map(line => line.split(delimiter))

  let issues = []

  // Remove white spaces and quotes, and lowercase annotTypes
  const headers = table[0].map(header => clean(header))
  const annotTypes = table[1].map(type => clean(type))

  issues = issues.concat(
    validateUniqueHeaders(headers),
    validateNameKeyword(headers),
    validateTypeKeyword(annotTypes),
    validateTypeAnnotations(annotTypes),
    validateHeaderCount(headers, annotTypes)
  )

  return issues
}

/** Get properties about this validation run to log to Mixpanel */
function getLogProps(errors, summary, file, fileType) {
  const defaultProps = {
    fileType,
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
      errors: errors.map(columns => columns[2])
    })
  }
}

/** Validate a local file, return list of any detected errors */
export async function validateFile(file, fileType) {
  let issues = []
  if (fileType === 'metadata') {issues = await validateFormat(file)}
  if (fileType === 'cluster') {issues = await validateFormat(file)}

  // Ingest Pipeline reports "issues", which includes "errors" and "warnings".
  // Keep issue type distinction in this module to ease porting, but for now
  // only report errors.
  const errors = issues.filter(issue => issue[0] === 'error')

  let summary = ''
  if (errors.length > 0) {
    const numErrors = errors.length
    const errorsTerm = (numErrors === 1) ? 'error' : 'errors'
    summary = `Your ${fileType} file had ${numErrors} ${errorsTerm}`
  }

  const logProps = getLogProps(errors, summary, file, fileType)
  log('file-validation', logProps)

  return { errors, summary }
}

