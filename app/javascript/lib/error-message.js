import React, { useState } from 'react'


/** Hook for enabling the conditional display an error message
  * in the event of an error
  * the returned ErrorComponent can be placed in the component's markup, and will be
  * displayed with the content from setErrorContent if setShowError is called with true
  */
export default function useErrorMessage() {
  const [showError, setShowError] = useState(false)
  const [errorContent, setErrorContent] = useState('')

  let ErrorComponent = <></>
  if (showError) {
    ErrorComponent = <div className="alert-danger text-center error-boundary">
      { errorContent }
    </div>
  }
  return {
    showError, setShowError, setErrorContent, ErrorComponent
  }
}

/**
  * wraps a call to an scp-api function in error handling
  * Once this code is good and stable, this should be folded into scp-api itself
  */
export function checkScpApiResponse(response, onError, setShowError, setErrorContent) {
  // currently, scp-api just hands back a raw response if not ok,
  // that isn't the best encapsulation of an API call, and should be refactored later
  if ('ok' in response && !response.ok) {
    response.json().then(response => {
      onError()
      setShowError(true)
      setErrorContent(response.error)
    })
  } else {
    return true
  }
}

/** handler for morpheus errors that catches the error from an empty gene search to
    replace it with a more useful display and error message. */
export function morpheusErrorHandler($target, setShowError, setErrorContent) {
  return err => {
    // this is a brittle check, but morpheus doesn't give us any visibility into what error occured,
    // other than that there was an error processing the results returned
    if (err[0].includes('genes') && err[0].includes('opening')) {
      setShowError(true)
      setErrorContent('The gene search returned no results for this study')
      // there doesn't seem to be any way to stop the morpheus dialog from popping up,
      // so we do the next best thing and destroy it immediately
      // see https://github.com/cmap/morpheus.js/blob/master/src/ui/heat_map.js:607
      setTimeout(() => $target.find('.modal').remove(), 0)
    }
  }
}
