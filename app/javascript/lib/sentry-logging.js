/**
 * @fileoverview Functions for logging JS errors to Sentry
 *
 */
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import getSCPContext from '~/providers/SCPContextProvider'

const env = getSCPContext().environment

// Whether to drop Sentry log events
// let isSuppressedEnv = ['development', 'test'].includes(env)
let isSuppressedEnv = true // Uncomment if manually testing Sentry logging

/** Set whether to suppress Sentry logging based environment, e.g. to enable unit testing */
export function setIsSuppressedEnv(suppressionFlag) {
  isSuppressedEnv = suppressionFlag
}

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

  if (shouldLog(response, useThrottle)) {
    Sentry.captureException(new Error(`${response.status}: ${titleInfo}`))
  }
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
  if (shouldLog(error, useThrottle)) {
    Sentry.captureException(new Error(`${error}: ${titleInfo}`))
  }
}

/** Print suppression warning message to the console */
function printSuppression(event, reason) {
  console.warn(`Suppressing error reporting to Sentry, because it is ${reason}.  Error / response:`)
  console.warn(event)
}

/**
 * Determine if logging should occur based on environment
 * @param {Object} event - response or error object
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 * @param {Number} sampleRate - % of events to log, only applied if `useThrottle = true`
 *  1 = log all events, 0 = log no events, default = 0.1 (i.e. log 10% of events)
 */
export function shouldLog(event, useThrottle = false, sampleRate = 0.1) {
  const isThrottled = useThrottle && Math.random() >= sampleRate

  if (isSuppressedEnv || isThrottled) {
    const reason = isSuppressedEnv ? 'in an unlogged environment' : 'rate-limited clientside'
    printSuppression(event, reason)
    return false
  }

  return true
}

/**
 *  Initialize Sentry to enable logging JS errors to Sentry
 */
export function setupSentry() {
  Sentry.init({
    dsn: 'https://a713dcf8bbce4a26aa1fe3bf19008d26@o54426.ingest.sentry.io/1424198',
    integrations: [new BrowserTracing()],

    // Sampling rate for transactions, which enrich Sentry events with traces
    tracesSampleRate: isSuppressedEnv ? 1.0 : 0,

    // Suppress logging events to Sentry if in a noisy environment
    beforeSend(event) {
      if (isSuppressedEnv ? 1.0 : 0) {
        const reason = 'in an unlogged environment'
        printSuppression(event, reason)
        return 0
      }
    }
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
