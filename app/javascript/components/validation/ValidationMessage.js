import React from 'react'
import ReactDOM from 'react-dom'
import _capitalize from 'lodash/capitalize'
import pluralize from 'pluralize'

import { supportEmailLink } from 'lib/error-utils'
import { isUserRegisteredForTerra } from 'providers/UserProvider'

/** Help users get reach us for support */
function SupportMessage({ studyAccession }) {
  return (
    <div>
    Need help? Email us at {supportEmailLink} with the errors,
    your study accession ({studyAccession}),
    and a description or attachment of your file.
    </div>
  )
}

const refresh =
  <a href="" data-analytics-name="sync-validation-refresh">
    Refresh the page
  </a>

/** Summarize errors and warnings */
function Summary({ messages, category, fileName=null, showRefreshLink=false }) {
  // E.g. "Errors", "Warning"
  const issueTxt = pluralize(_capitalize(category), messages.length)

  if (category === 'error') {
    const redo = showRefreshLink ? refresh : 'Re-choose the file'
    return <p>{issueTxt} found.  {redo} after correcting {fileName}.</p>
  } else {
    return <p>{issueTxt}:</p>
  }
}

/**
 * Show result of file validation issue for upload UI or sync UI
 */
export default function ValidationMessage({
  studyAccession, issues, fileName, isSync=false
}) {
  const errorMsgs = issues.errors?.map(error => error[2])
  const warningMsgs = issues.warnings?.map(warning => warning[2])

  const hasLargeFile = issues.infos?.find(info => info[1] === 'size:large')

  let syncSuggestion = ''
  if (!isSync && isUserRegisteredForTerra() && hasLargeFile) {
    syncSuggestion = (
      <>
      Your file is large.  If it is already in a Terra
      workspace,{' '}
        <a href="sync" target="_blank" data-analytics-name="sync-suggestion">
          sync your file
        </a>{' '}
      to add it faster.
      </>)
  }

  return (
    <>
      { errorMsgs?.length > 0 &&
      <div className="validation-error" data-testid="validation-error">
        <Summary messages={errorMsgs} category='error' fileName={fileName} showRefreshLink={isSync} />
        <ul>{errorMsgs.map((msg, i) => {
          return <li className="validation-error" key={i}>{msg}</li>
        })}
        </ul>
        <SupportMessage studyAccession={studyAccession} />
        <br/>
      </div>
      }
      { warningMsgs?.length > 0 &&
      <div className="validation-warning" data-testid="validation-warning">
        <Summary messages={warningMsgs} category='warning' />
        <ul>{ warningMsgs.map((msg, index) => {
          return <li className="validation-warning" key={index}>{msg}</li>
        })}</ul>
      </div>
      }
      { syncSuggestion !== '' &&
      <div className="validation-info" data-testid="validation-info">
        { syncSuggestion}
      </div>
      }
    </>
  )
}

/** Convenience function to render this in a non-React part of the app */
export function renderValidationMessage(
  target, studyAccession, issues, fileName, isSync
) {
  ReactDOM.unmountComponentAtNode(target)
  ReactDOM.render(
    <ValidationMessage
      studyAccession={studyAccession}
      issues={issues}
      fileName={fileName}
      isSync={isSync}
    />,
    target
  )
}
