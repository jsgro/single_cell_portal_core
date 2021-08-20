import React from 'react'
import ReactDOM from 'react-dom'

/** Renders a report of file validation errors for upload UI */
export default function ValidationAlert({ errors }) {
  const numErrors = errors.length
  const errorsTxt = (numErrors === 1) ? 'error' : 'errors'

  return (
    <div className="alert alert-danger">
      <p>
      Your metadata file had {numErrors} {errorsTxt}:
      </p>
      <ul>{errors.map((columns, i) => {
        return <li key={i}>{columns[2]}</li>
      })}
      </ul>
    </div>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationAlert(target, errors) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationAlert errors={errors}/>,
    target
  )
}
