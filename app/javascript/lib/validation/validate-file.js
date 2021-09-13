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
 * Verify second row starts with TYPE (case-insensitive)
 */
function validateTypeKeyword(annotTypes) {
  const issues = []

  const value = annotTypes[0]

  if (value.toUpperCase() === 'TYPE') {
    if (value !== 'TYPE') {
      const msg = `File keyword "TYPE" provided as "${value}"`
      issues.push(['warn', 'format', msg])
    }
  } else {
    const msg =
      'Second row, first column must be "TYPE" (case insensitive). ' +
      `Provided value was "${value}".`
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
function sniffDelimiter(lines) {
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

  return bestDelimiter
}

/** Validate a local metadata file */
async function validateMetadata(file) {
  const { lines, fileMimeType } = await readLinesAndType(file, 2)

  const delimiter = sniffDelimiter(lines)
  const table = lines.map(line => line.split(delimiter))

  let issues = []

  // Remove white spaces and quotes, and lowercase annotTypes
  const headers = table[0].map(header => clean(header))
  const annotTypes = table[1].map(type => clean(type))

  issues = issues.concat(
    validateUniqueHeaders(headers),
    validateTypeKeyword(annotTypes)
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
  if (fileType === 'metadata') {issues = await validateMetadata(file)}

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

