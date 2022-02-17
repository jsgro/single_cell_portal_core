import React from 'react'
import ReactDOM from 'react-dom'
import { supportEmailLink } from 'lib/error-utils'
import _capitalize from 'lodash/capitalize'
import pluralize from 'pluralize'

const supportMessage = <div>
  If you need help, let us know at {supportEmailLink}.
  Please include the above errors, your file, and study accession.
</div>

const refresh =
  <a href="" data-analytics-name="sync-validation-refresh">
    Refresh the page
  </a>

/** Summarize errors and warnings */
function Summary({ msgs, issueCategory, fileName=null, isSync=false }) {
  // E.g. "Errors", "Warning"
  const issueTxt = pluralize(_capitalize(issueCategory), msgs.length)

  if (issueCategory === 'error') {
    const redo = isSync ? refresh : 'Re-choose the file'
    return <p>{issueTxt} found.  {redo} after correcting {fileName}.</p>
  } else {
    return <p>{issueTxt}:</p>
  }
}

/**
 * Displays result of file validation issue for sync UI
 *
 * TODO (SCP-4119): Integrate this component into FileUploadControl.js
 */
export default function ValidationMessage({ errorMsgs, warningMsgs, fileName, isSync=false }) {
  return (
    <>
      { errorMsgs?.length > 0 &&
      <div className="validation-error" data-testid="validation-error">
        <Summary msgs={errorMsgs} issueCategory='error' fileName={fileName} isSync={isSync} />
        <ul>{errorMsgs.map((msg, i) => {
          return <li className="validation-error" key={i}>{msg}</li>
        })}
        </ul>
        {supportMessage}
        <br/>
      </div>
      }
      { warningMsgs?.length > 0 &&
      <div className="validation-warning" data-testid="validation-warning">
        <Summary msgs={warningMsgs} issueCategory='warning' />
        <ul>{ warningMsgs.map((msg, index) => {
          return <li className="validation-warning" key={index}>{msg}</li>
        })}</ul>
      </div>
      }
    </>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationMessage(target, errorMsgs, warningMsgs, fileName, isSync) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationMessage
      errorMsgs={errorMsgs}
      warningMsgs={warningMsgs}
      fileName={fileName}
      isSync={isSync}
    />,
    target
  )
}
