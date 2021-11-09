import React from 'react'
import ReactDOM from 'react-dom'
import _kebabCase from 'lodash/kebabCase'
import { supportEmailLink } from 'lib/error-utils'

const supportMessage = <div>
  If you need help, let us know at {supportEmailLink}.
  Please include the above errors, your file, and study accession.
</div>

/** Renders a report of file validation errors for upload UI */
export default function ValidationAlert({ summary, errors, fileType }) {
  return (
    <div
      className="alert alert-danger"
      data-testid={`${_kebabCase(fileType)}-validation-alert`}
    >
      <p>{summary}:</p>
      <ul>{errors.map((columns, i) => {
        return <li key={i}>{columns[2]}</li>
      })}
      </ul>
      <br/>
      {supportMessage}
    </div>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationAlert(target, summary, errors, fileType) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationAlert
      summary={summary}
      errors={errors}
      fileType={fileType}
    />,
    target
  )
}
