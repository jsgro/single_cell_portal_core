/**
 * @fileoverview Functions for logging JS errors to Sentry
 *
 */
import * as Sentry from '@sentry/react'
import getSCPContext from '~/providers/SCPContextProvider'

const env = getSCPContext().environment
setUptoLog()

/**
 * Log an exception to Sentry for bad response JS fetch executions
 * i.e. executions that results in a 404 response
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 */
export function logJSFetchExceptionToSentry(response, titleInfo = {}) {
  if (['development', 'test'].includes(env)) {
    return
  }
  // add details from the response to the 'response info' object that will be logged in Sentry
  Sentry.setContext('response info', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  })

  Sentry.captureException(new Error(`${response.status}: ${titleInfo}`))
}

/**
 * Log an exception to Sentry for failed JS fetch executions
 * i.e. fetches that fail and error
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 */
export function logJSFetchErrorToSentry(error, titleInfo = {}) {
  if (['development', 'test'].includes(env)) {
    return
  }
  Sentry.captureException(new Error(`${error}: ${titleInfo}`))
}

/**
 * Set up the correct scope and set the logger tag to the appropriate name
 */
function setUptoLog() {
  // set the scope to the current environment
  Sentry.configureScope(scope =>
    scope.addEventProcessor(
      event =>
        new Promise(resolve =>
          resolve({
            ...event,
            environment: env
          })
        )
    )
  )

  // JS errors will be logged as 'app-frontend' in Sentry
  Sentry.setTag('logger', 'app-frontend')
}
