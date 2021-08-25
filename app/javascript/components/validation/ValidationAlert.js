import React from 'react'
import ReactDOM from 'react-dom'

import { log } from 'lib/metrics-api'

/** Renders a report of file validation errors for upload UI */
export default function ValidationAlert({ errors, fileType }) {
  const numErrors = errors.length
  const errorsTerm = (numErrors === 1) ? 'error' : 'errors'

  const summary = `Your ${fileType} file had ${numErrors} ${errorsTerm}`

  // TODO (SCP-3608): Improve observability of in-app validation analytics
  // We'll extend and/or refine this logging to handle multiple different
  // types of validation errors (e.g. format, ontology, etc.) in a way that
  // eases reporting for various use cases.
  log('error:file-validation', {
    fileType,
    summary,
    numErrors,
    errors: errors.map(columns => columns[2])
  })

  return (
    <div className="alert alert-danger">
      <p>
      Your metadata file had {numErrors} {errorsTerm}:
      </p>
      <ul>{errors.map((columns, i) => {
        return <li key={i}>{columns[2]}</li>
      })}
      </ul>
    </div>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationAlert(target, errors, fileType) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationAlert errors={errors} fileType={fileType}/>,
    target
  )
}
