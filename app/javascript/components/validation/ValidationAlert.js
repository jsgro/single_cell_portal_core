import React from 'react'
import ReactDOM from 'react-dom'

import { log } from 'lib/metrics-api'

/** Renders a report of file validation errors for upload UI */
export default function ValidationAlert({ errors, file, fileType }) {
  const numErrors = errors.length
  const errorsTerm = (numErrors === 1) ? 'error' : 'errors'

  const summary = `Your ${fileType} file had ${numErrors} ${errorsTerm}`

  console.log('file', file)

  // TODO (SCP-3608): Improve observability of in-app validation analytics
  // We'll extend and/or refine this logging to handle multiple different
  // types of validation errors (e.g. format, ontology, etc.) in a way that
  // eases reporting for various use cases.
  log('error:file-validation', {
    fileType,
    summary,
    numErrors,
    'file:name': file.name,
    'file:size': file.size,
    'file:mimeType': file.type,
    'errors': errors.map(columns => columns[2])
  })

  const testId = `${fileType}-validation-alert`

  return (
    <div className="alert alert-danger" data-testid={testId}>
      <p>
      Your {fileType} file had {numErrors} {errorsTerm}:
      </p>
      <ul>{errors.map((columns, i) => {
        return <li key={i}>{columns[2]}</li>
      })}
      </ul>
    </div>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationAlert(target, errors, file, fileType) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationAlert errors={errors} file={file} fileType={fileType}/>,
    target
  )
}
