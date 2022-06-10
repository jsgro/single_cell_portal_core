/**
 * @fileoverview Functions for logging JS errors to Sentry
 *
 */
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import getSCPContext from '~/providers/SCPContextProvider'

/**
 * Log an exception to Sentry for bad response JS fetch executions
 * e.g. requests that result in a 404 response
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 */
export function logJSFetchExceptionToSentry(response, titleInfo = '', useThrottle = false) {
  // add details from the response to the 'response info' object that will be logged in Sentry
  Sentry.setContext('response info', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  })

  const errorObj = new Error(`${response.status}: ${titleInfo}`)

  logToSentry(errorObj, useThrottle)
}

/**
 * Log an exception to Sentry for failed JS fetch executions
 * i.e. fetches that fail and error
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 */
export function logJSFetchErrorToSentry(error, titleInfo = '', useThrottle = false) {
  const errorObj = new Error(`${error}: ${titleInfo}`)
  logToSentry(errorObj, useThrottle)
}

/** Print suppression warning message to the console */
function printSuppression(errorObj, reason) {
  const reasonMap = {
    environment: 'in an unlogged environment',
    throttle: 'this event is throttled by client'
  }

  const message = `Suppressing error report to Sentry: ${reasonMap[reason]}`
  console.warn(errorObj.url ? `${message }  Error:` : message)

  // Error objects are printed via console.error already, so only surface Sentry-suppressed responses
  if (errorObj.url) {
    console.warn(errorObj)
  }
}

/**
 * Log to Sentry, except if in unlogged environment or throttled away
 * @param {Object} error - Error object to log to Sentry
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling. Default false.
 * @param {Number} sampleRate - % of events to log, only applied if `useThrottle = true`
 *  1 = log all events, 0 = log no events, default = 0.05 (i.e. log 5% of events)
 *
 * @return {Array} two-element array: [whether logging should occur, why if not]
 */
export function logToSentry(error, useThrottle = false, sampleRate = 0.05) {
  const isThrottled = useThrottle && Math.random() >= sampleRate

  const env = getSCPContext().environment
  // Whether to drop Sentry log events
  // Set to `false` if manually locally testing Sentry logging
  const isSuppressedEnv = ['development', 'test'].includes(env)

  if (isSuppressedEnv || isThrottled) {
    const reason = isThrottled ? 'throttled' : 'environment'
    printSuppression(error, reason)
    return
  }

  Sentry.captureException(error)
}

/**
 *  Initialize Sentry to enable logging JS errors to Sentry
 */
export function setupSentry() {
  Sentry.init({
    dsn: 'https://a713dcf8bbce4a26aa1fe3bf19008d26@o54426.ingest.sentry.io/1424198',
    integrations: [new BrowserTracing()],

    // Sampling rate for transactions, which enrich Sentry events with traces
    tracesSampleRate: 1.0
  })

  // set the logger tag to reflect that the errors are from the frontend
  Sentry.setTag('logger', 'app-frontend')

  // set the scope for Sentry to the current environment
  Sentry.configureScope(scope =>
    scope.addEventProcessor(
      event =>
        new Promise(resolve =>
          resolve({
            ...event,
            environment: getSCPContext().environment
          })
        )
    )
  )
}
